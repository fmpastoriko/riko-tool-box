export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type Message = {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
  modelUsed?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  repo_path: string | null;
  model: string | null;
  created_at: string;
};

export type ModelInfo = { name: string; provider: string; exhausted: boolean };

export function messageText(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}
