import {
  PROVIDER_CHAIN,
  CHAIN_UNDER_THRESHOLD,
  CHAIN_OVER_THRESHOLD,
  CHAIN_THRESHOLD_TOKENS,
  getKeysForModel,
  type ModelConfig,
} from "@/lib/llmProviders";
import { getExhaustedKeys, markKeyExhausted } from "@/lib/llmExhaustion";
import { PUBLIC_GROQ_MODEL } from "@/config/llm";

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";

const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
};

function estimateTokenCount(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") {
      chars += m.content.length;
    } else {
      for (const p of m.content) {
        if (p.type === "text") chars += p.text.length;
      }
    }
  }
  return Math.ceil(chars / 4);
}

function getChainForTokens(tokenCount: number): ModelConfig[] {
  return tokenCount < CHAIN_THRESHOLD_TOKENS
    ? CHAIN_UNDER_THRESHOLD
    : CHAIN_OVER_THRESHOLD;
}

async function geminiStreamRequest(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array> | null> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts:
        typeof m.content === "string"
          ? [{ text: m.content }]
          : m.content.map((p) =>
              p.type === "text"
                ? { text: p.text }
                : {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: p.image_url.url.split(",")[1] ?? "",
                    },
                  },
            ),
    }));

  const systemMsg = messages.find((m) => m.role === "system");
  const body: Record<string, unknown> = { contents };
  if (systemMsg) {
    body.system_instruction = {
      parts: [
        {
          text: typeof systemMsg.content === "string" ? systemMsg.content : "",
        },
      ],
    };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (res.status === 429) return null;
  if (!res.ok || !res.body) throw new Error(`Gemini error ${res.status}`);

  const encoder = new TextEncoder();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const token =
              json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (token) controller.enqueue(encoder.encode(token));
          } catch {}
        }
      }
      controller.close();
    },
  });
}

async function geminiGenerateText(
  model: string,
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );
  if (res.status === 429) return null;
  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function groqStreamRequest(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array> | null> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (res.status === 429) return null;
  if (!res.ok || !res.body) throw new Error(`Groq error ${res.status}`);

  const encoder = new TextEncoder();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const token = json?.choices?.[0]?.delta?.content ?? "";
            if (token) controller.enqueue(encoder.encode(token));
          } catch {}
        }
      }
      controller.close();
    },
  });
}

async function groqGenerateText(
  model: string,
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  });
  if (res.status === 429) return null;
  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function glmStreamRequest(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array> | null> {
  const res = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (res.status === 429) return null;
  if (!res.ok || !res.body) throw new Error(`GLM error ${res.status}`);

  const encoder = new TextEncoder();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const token = json?.choices?.[0]?.delta?.content ?? "";
            if (token) controller.enqueue(encoder.encode(token));
          } catch {}
        }
      }
      controller.close();
    },
  });
}

async function glmGenerateText(
  model: string,
  apiKey: string,
  prompt: string,
): Promise<string | null> {
  const res = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    }),
  });
  if (res.status === 429) return null;
  if (!res.ok) throw new Error(`GLM error ${res.status}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function tryChain(
  chain: ModelConfig[],
  fn: (
    config: ModelConfig,
    key: string,
  ) => Promise<ReadableStream<Uint8Array> | string | null>,
): Promise<{
  result: ReadableStream<Uint8Array> | string;
  modelUsed: string;
} | null> {
  for (const config of chain) {
    const keys = getKeysForModel(config.envPrefix);
    if (keys.length === 0) continue;
    const exhausted = await getExhaustedKeys(config.model);
    for (let i = 0; i < keys.length; i++) {
      if (exhausted.has(i)) continue;
      try {
        const result = await fn(config, keys[i]);
        if (result === null) {
          await markKeyExhausted(config.model, i);
          continue;
        }
        return { result, modelUsed: config.model };
      } catch {}
    }
  }
  return null;
}

function dispatchStream(
  config: ModelConfig,
  key: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array> | null> {
  if (config.provider === "gemini")
    return geminiStreamRequest(config.model, key, messages);
  if (config.provider === "glm")
    return glmStreamRequest(config.model, key, messages);
  return groqStreamRequest(config.model, key, messages);
}

function dispatchText(
  config: ModelConfig,
  key: string,
  prompt: string,
): Promise<string | null> {
  if (config.provider === "gemini")
    return geminiGenerateText(config.model, key, prompt);
  if (config.provider === "glm")
    return glmGenerateText(config.model, key, prompt);
  return groqGenerateText(config.model, key, prompt);
}

export async function streamChat(
  messages: ChatMessage[],
  isOwner: boolean,
  preferredModel?: string,
): Promise<{ stream: ReadableStream<Uint8Array>; modelUsed: string }> {
  const publicKey = process.env.GROQ_API_KEY_PUBLIC;

  if (!IS_LOCAL || !isOwner) {
    if (!publicKey) throw new Error("No models available");
    const stream = await groqStreamRequest(
      PUBLIC_GROQ_MODEL,
      publicKey,
      messages,
    );
    if (!stream) throw new Error("No models available");
    return { stream, modelUsed: PUBLIC_GROQ_MODEL };
  }

  let chain: ModelConfig[];
  if (preferredModel) {
    const preferred = PROVIDER_CHAIN.find((m) => m.model === preferredModel);
    chain = preferred
      ? [preferred, ...PROVIDER_CHAIN.filter((m) => m.model !== preferredModel)]
      : PROVIDER_CHAIN;
  } else {
    chain = getChainForTokens(estimateTokenCount(messages));
  }

  const found = await tryChain(chain, (config, key) =>
    dispatchStream(config, key, messages),
  );

  if (!found) throw new Error("No models available");
  return {
    stream: found.result as ReadableStream<Uint8Array>,
    modelUsed: found.modelUsed,
  };
}

export async function generateText(
  prompt: string,
  isOwner: boolean,
  preferredModel?: string,
): Promise<{ text: string; modelUsed: string }> {
  const publicKey = process.env.GROQ_API_KEY_PUBLIC;

  if (!IS_LOCAL || !isOwner) {
    if (!publicKey) throw new Error("No models available");
    const text = await groqGenerateText(PUBLIC_GROQ_MODEL, publicKey, prompt);
    if (text === null) throw new Error("No models available");
    return { text, modelUsed: PUBLIC_GROQ_MODEL };
  }

  let chain: ModelConfig[];
  if (preferredModel) {
    const preferred = PROVIDER_CHAIN.find((m) => m.model === preferredModel);
    chain = preferred
      ? [preferred, ...PROVIDER_CHAIN.filter((m) => m.model !== preferredModel)]
      : PROVIDER_CHAIN;
  } else {
    chain = getChainForTokens(Math.ceil(prompt.length / 4));
  }

  const found = await tryChain(chain, (config, key) =>
    dispatchText(config, key, prompt),
  );

  if (!found) throw new Error("No models available");
  return { text: found.result as string, modelUsed: found.modelUsed };
}
