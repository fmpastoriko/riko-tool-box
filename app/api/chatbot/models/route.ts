import { NextResponse } from "next/server";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { PROVIDER_CHAIN, getKeysForModel } from "@/lib/llmProviders";
import { getAllExhaustedModels } from "@/lib/llmExhaustion";
import { PUBLIC_GROQ_MODEL } from "@/config/llm";

const PUBLIC_MODELS = [
  { name: PUBLIC_GROQ_MODEL, provider: "groq", exhausted: false },
];

export async function GET() {
  const role = await getServerRole();
  const owner = isOwnerRole(role);

  if (!owner) return NextResponse.json({ models: PUBLIC_MODELS });

  const exhaustedMap = await getAllExhaustedModels();
  const models = PROVIDER_CHAIN.map((config) => {
    const keys = getKeysForModel(config.envPrefix);
    const exhaustedKeys = exhaustedMap[config.model] ?? [];
    const allKeysExhausted =
      keys.length > 0 && Array.from(exhaustedKeys).length >= keys.length;
    return {
      name: config.model,
      provider: config.provider,
      exhausted: allKeysExhausted || keys.length === 0,
    };
  });

  return NextResponse.json({
    models: models.every((m) => m.exhausted) ? PUBLIC_MODELS : models,
  });
}
