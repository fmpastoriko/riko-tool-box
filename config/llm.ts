export const PUBLIC_GROQ_MODEL =
  process.env.GROQ_PUBLIC_MODEL ?? "llama-3.3-70b-versatile";

export const LLM_TOKEN_LIMIT = Number(process.env.NEXT_PUBLIC_LLM_TOKEN_LIMIT || 11000);

export const WIB_RESET_HOUR = Number(process.env.WIB_RESET_HOUR ?? 8);
