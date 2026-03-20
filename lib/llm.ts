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

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_CTX = Number(process.env.OLLAMA_CTX ?? 8192);
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.2";
const OLLAMA_SMART_SELECT_MODEL =
  process.env.OLLAMA_SMART_SELECT_MODEL ?? "llama3.2";
const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";

export function useOllama(): boolean {
  return process.env.USE_OLLAMA === "true";
}

export function getOllamaUrl(): string {
  return OLLAMA_URL;
}

export function getChatModel(): string {
  return OLLAMA_CHAT_MODEL;
}

export function getSmartSelectModel(): string {
  return OLLAMA_SMART_SELECT_MODEL;
}

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

async function hasOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
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

function ollamaStream(
  model: string,
  messages: ChatMessage[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: { num_ctx: OLLAMA_CTX },
        }),
      });
      if (!res.ok || !res.body) {
        controller.close();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          try {
            const json = JSON.parse(line);
            const token = json?.message?.content ?? "";
            if (token) controller.enqueue(encoder.encode(token));
          } catch {}
        }
      }
      controller.close();
    },
  });
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

export async function streamChat(
  messages: ChatMessage[],
  isOwner: boolean,
  preferredModel?: string,
): Promise<{ stream: ReadableStream<Uint8Array>; modelUsed: string }> {
  if (!IS_LOCAL) {
    const publicKey = process.env.GROQ_API_KEY_PUBLIC;
    if (!publicKey) throw new Error("No models available");
    const stream = await groqStreamRequest(
      PUBLIC_GROQ_MODEL,
      publicKey,
      messages,
    );
    if (!stream) throw new Error("No models available");
    return { stream, modelUsed: PUBLIC_GROQ_MODEL };
  }

  if (!isOwner) {
    if (await hasOllama()) {
      return {
        stream: ollamaStream(OLLAMA_CHAT_MODEL, messages),
        modelUsed: OLLAMA_CHAT_MODEL,
      };
    }
    throw new Error("No models available");
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
    config.provider === "gemini"
      ? geminiStreamRequest(config.model, key, messages)
      : groqStreamRequest(config.model, key, messages),
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
  if (!IS_LOCAL) {
    const publicKey = process.env.GROQ_API_KEY_PUBLIC;
    if (!publicKey) throw new Error("No models available");
    const text = await groqGenerateText(PUBLIC_GROQ_MODEL, publicKey, prompt);
    if (text === null) throw new Error("No models available");
    return { text, modelUsed: PUBLIC_GROQ_MODEL };
  }

  if (!isOwner) {
    if (await hasOllama()) {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_SMART_SELECT_MODEL,
          prompt,
          stream: false,
        }),
      });
      const data = await res.json();
      return {
        text: data?.response ?? "",
        modelUsed: OLLAMA_SMART_SELECT_MODEL,
      };
    }
    throw new Error("No models available");
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
    config.provider === "gemini"
      ? geminiGenerateText(config.model, key, prompt)
      : groqGenerateText(config.model, key, prompt),
  );

  if (!found) throw new Error("No models available");
  return { text: found.result as string, modelUsed: found.modelUsed };
}
