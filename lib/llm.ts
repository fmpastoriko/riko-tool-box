import {
  DEFAULT_GROQ_CHAT_MODEL,
  DEFAULT_GROQ_SMART_SELECT_MODEL,
} from "@/config/models.config";

const OLLAMA_URL = process.env.OLLAMA_URL;
const OLLAMA_CTX = parseInt(process.env.OLLAMA_CTX ?? "16384");
const OLLAMA_CHAT_MODEL =
  process.env.OLLAMA_CHAT_MODEL ?? process.env.OLLAMA_MODEL;
const OLLAMA_SMART_SELECT_MODEL =
  process.env.OLLAMA_SMART_SELECT_MODEL ?? process.env.OLLAMA_MODEL;

export function getGroqKeys(isOwner: boolean): string[] {
  if (isOwner) {
    const keys: string[] = [];
    for (let i = 1; ; i++) {
      const k = process.env[`OWNER_GROQ_API_KEY_${i}`];
      if (!k) break;
      keys.push(k);
    }
    if (keys.length === 0 && process.env.OWNER_GROQ_API_KEY) {
      keys.push(process.env.OWNER_GROQ_API_KEY);
    }
    if (keys.length === 0) throw new Error("OWNER_GROQ_API_KEY is not set");
    return keys;
  }
  const key = process.env.PUBLIC_GROQ_API_KEY;
  if (!key) throw new Error("PUBLIC_GROQ_API_KEY is not set");
  return [key];
}

export function getGroqKey(isOwner: boolean): string {
  return getGroqKeys(isOwner)[0];
}

export function useOllama(): boolean {
  return !!OLLAMA_URL;
}

export function getOllamaUrl(): string {
  if (!OLLAMA_URL) throw new Error("OLLAMA_URL is not set");
  return OLLAMA_URL;
}

export function getChatModel(
  isOwner: boolean,
  keyIndex = 0,
): {
  provider: "ollama" | "groq";
  model: string;
  apiKey?: string;
} {
  if (useOllama() && OLLAMA_CHAT_MODEL) {
    return { provider: "ollama", model: OLLAMA_CHAT_MODEL };
  }
  const keys = getGroqKeys(isOwner);
  return {
    provider: "groq",
    model: process.env.GROQ_CHAT_MODEL ?? DEFAULT_GROQ_CHAT_MODEL,
    apiKey: keys[keyIndex % keys.length],
  };
}

export function getSmartSelectModel(
  isOwner: boolean,
  keyIndex = 0,
): {
  provider: "ollama" | "groq";
  model: string;
  apiKey?: string;
} {
  if (useOllama() && OLLAMA_SMART_SELECT_MODEL) {
    return { provider: "ollama", model: OLLAMA_SMART_SELECT_MODEL };
  }
  const keys = getGroqKeys(isOwner);
  return {
    provider: "groq",
    model:
      process.env.GROQ_SMART_SELECT_MODEL ?? DEFAULT_GROQ_SMART_SELECT_MODEL,
    apiKey: keys[keyIndex % keys.length],
  };
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = { role: string; content: string | ContentPart[] };

export async function streamChat(
  messages: ChatMessage[],
  isOwner: boolean,
  modelOverride?: string,
  abortSignal?: AbortSignal,
): Promise<ReadableStream> {
  if (modelOverride) {
    const keys = getGroqKeys(isOwner);
    for (let i = 0; i < keys.length; i++) {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keys[i]}`,
          },
          body: JSON.stringify({
            model: modelOverride,
            messages,
            stream: true,
          }),
          signal: abortSignal,
        },
      );
      if (res.status === 429 && i < keys.length - 1) continue;
      if (!res.ok || !res.body) throw new Error("Groq error");
      return groqStream(res);
    }
    throw new Error("All Groq keys exhausted");
  }

  const cfg = getChatModel(isOwner);

  if (cfg.provider === "ollama") {
    const res = await fetch(`${getOllamaUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        stream: true,
        options: { num_ctx: OLLAMA_CTX },
        messages,
      }),
      signal: abortSignal,
    });
    if (!res.ok || !res.body) throw new Error("Ollama error");
    return new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder
              .decode(value, { stream: true })
              .split("\n")) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                const token: string = json?.message?.content ?? "";
                if (token) controller.enqueue(new TextEncoder().encode(token));
                if (json.done) controller.close();
              } catch {}
            }
          }
        } catch {
          controller.error("stream error");
        }
      },
    });
  }

  const keys = getGroqKeys(isOwner);
  for (let i = 0; i < keys.length; i++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys[i]}`,
      },
      body: JSON.stringify({ model: cfg.model, messages, stream: true }),
      signal: abortSignal,
    });
    if (res.status === 429 && i < keys.length - 1) continue;
    if (!res.ok || !res.body) throw new Error("Groq error");
    return groqStream(res);
  }
  throw new Error("All Groq keys exhausted");
}

function groqStream(res: Response): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const json = JSON.parse(trimmed.slice(6));
              const token: string = json?.choices?.[0]?.delta?.content ?? "";
              if (token) controller.enqueue(new TextEncoder().encode(token));
            } catch {}
          }
        }
        controller.close();
      } catch {
        controller.error("stream error");
      }
    },
  });
}

export async function generateText(
  prompt: string,
  isOwner: boolean,
): Promise<string> {
  const cfg = getSmartSelectModel(isOwner);

  if (cfg.provider === "ollama") {
    const res = await fetch(`${getOllamaUrl()}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        stream: false,
        options: { num_ctx: OLLAMA_CTX },
        prompt,
      }),
    });
    if (!res.ok) throw new Error("Ollama error");
    const data = await res.json();
    return data.response ?? "";
  }

  const keys = getGroqKeys(isOwner);
  for (let i = 0; i < keys.length; i++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys[i]}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        stream: false,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.status === 429 && i < keys.length - 1) continue;
    if (!res.ok) throw new Error(`Groq error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("All Groq keys exhausted");
}
