export type Provider = "gemini" | "groq";

export interface ModelConfig {
  model: string;
  provider: Provider;
  envPrefix: string;
}

export const CHAIN_THRESHOLD_TOKENS = Number(
  process.env.NEXT_PUBLIC_LLM_CHAIN_THRESHOLD ?? 3000,
);

export const PROVIDER_CHAIN: ModelConfig[] = [
  {
    model: "gemini-2.5-flash",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-3-flash",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-2.5-flash-lite",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-3.1-flash-lite",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "llama-3.3-70b-versatile",
    provider: "groq",
    envPrefix: "OWNER_GROQ_API_KEY",
  },
  {
    model: "llama-4-scout-17b-16e-instruct",
    provider: "groq",
    envPrefix: "OWNER_GROQ_API_KEY",
  },
];

export const CHAIN_UNDER_THRESHOLD: ModelConfig[] = [
  {
    model: "llama-3.3-70b-versatile",
    provider: "groq",
    envPrefix: "OWNER_GROQ_API_KEY",
  },
  {
    model: "gemini-2.5-flash-lite",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-3.1-flash-lite",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "llama-4-scout-17b-16e-instruct",
    provider: "groq",
    envPrefix: "OWNER_GROQ_API_KEY",
  },
];

export const CHAIN_OVER_THRESHOLD: ModelConfig[] = [
  {
    model: "gemini-2.5-flash",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-3-flash",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-2.5-flash-lite",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "gemini-3.1-flash-lite",
    provider: "gemini",
    envPrefix: "OWNER_GEMINI_API_KEY",
  },
  {
    model: "llama-3.3-70b-versatile",
    provider: "groq",
    envPrefix: "OWNER_GROQ_API_KEY",
  },
  {
    model: "llama-4-scout-17b-16e-instruct",
    provider: "groq",
    envPrefix: "OWNER_GROQ_API_KEY",
  },
];

export function getKeysForModel(envPrefix: string): string[] {
  const keys: string[] = [];
  let i = 1;
  while (true) {
    const val = process.env[`${envPrefix}_${i}`];
    if (!val) break;
    keys.push(val);
    i++;
  }
  return keys;
}
