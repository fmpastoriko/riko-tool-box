import { NextRequest } from "next/server";
import { streamChat } from "@/lib/llm";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_MESSAGES = 50;
const MAX_MESSAGE_CONTENT_BYTES = 64 * 1024;
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Message = {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
};

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(req, 60);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
    });
  }

  const { messages, model } = (await req.json()) as {
    messages: Message[];
    model?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
    });
  }

  if (messages.length > MAX_MESSAGES) {
    return new Response(
      JSON.stringify({ error: `Too many messages (max ${MAX_MESSAGES})` }),
      { status: 400 },
    );
  }

  for (const m of messages) {
    const contentStr =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    if (Buffer.byteLength(contentStr, "utf8") > MAX_MESSAGE_CONTENT_BYTES) {
      return new Response(
        JSON.stringify({ error: "Message content too large" }),
        { status: 413 },
      );
    }
  }

  const hasImage = messages.some(
    (m) =>
      Array.isArray(m.content) && m.content.some((p) => p.type === "image_url"),
  );

  const role = await getServerRole();
  const owner = isOwnerRole(role);

  try {
    const stream = await streamChat(
      messages,
      owner,
      hasImage ? VISION_MODEL : model,
    );
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  }
}
