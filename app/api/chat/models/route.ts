import { NextResponse } from "next/server";
import { GROQ_MODELS } from "@/config/models.config";
import { getGroqKey, useOllama, getOllamaUrl } from "@/lib/llm";
import { getServerRole, isOwnerRole } from "@/lib/session";

export async function GET() {
  const role = await getServerRole();
  const owner = isOwnerRole(role);
  const models: { name: string; provider: string }[] = [];

  try {
    const key = getGroqKey(owner);
    if (key) {
      for (const m of GROQ_MODELS) {
        models.push({ name: m, provider: "groq" });
      }
    }
  } catch {}

  if (useOllama()) {
    try {
      const res = await fetch(`${getOllamaUrl()}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        for (const m of data.models ?? []) {
          models.push({ name: m.name, provider: "ollama" });
        }
      }
    } catch {}
  }

  return NextResponse.json({ models });
}
