import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 30);
  if (!limit.allowed)
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const { topic, count } = body as { topic: string; count: number };

  if (!topic || !count || count < 1 || count > 30) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const role = await getServerRole();
  const owner = isOwnerRole(role);

  const prompt = `Generate exactly ${count} Indonesian words related to the topic: "${topic}".
Rules:
- Return ONLY a JSON array of strings, nothing else, no markdown, no explanation
- All words must be in Bahasa Indonesia
- Words should be nouns or common vocabulary
- Each word must be between 3 and 15 characters
- No spaces within words
- All uppercase
- No duplicate words
- Vary word length for a good puzzle mix

Example output format: ["KUCING","ANJING","BURUNG","IKAN","GAJAH"]`;

  try {
    const { text } = await generateText(prompt, owner);
    const clean = text.replace(/```json|```/g, "").trim();
    const words = JSON.parse(clean) as string[];

    if (!Array.isArray(words)) throw new Error("Not an array");

    const filtered = words
      .filter((w) => typeof w === "string" && w.length >= 3 && w.length <= 20)
      .map((w) => w.toUpperCase().replace(/\s/g, ""))
      .slice(0, count);

    return NextResponse.json({ words: filtered });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate words" },
      { status: 500 },
    );
  }
}
