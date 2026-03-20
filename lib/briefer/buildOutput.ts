import { summarizeFile } from "@/lib/summarize";

export const FOOTER_APPEND = `
DO NOT ADD ANY COMMENTS.

THIS IS A MUST: To avoid ambiguity, if you create files, NAME THE FILES WITH THEIR PATH. Example: app/tools/Page.tsx become "app-tools-page"

Return only code, no explanation unless asked.

Preserve existing code style and conventions.

Do not add placeholder comments like // TODO or // implement this.

If you need to tell me something, tell me through chat.

Before doing anything, explain your plan first and ask for my permission and input.

If you are in doubt, always ask me first — do not assume.

Do not make up non-existent problems for the sake of feedback. If the code is good enough, say so.

Do not use m-dash.`.trim();

export const DEFAULT_PROMPT =
  "This is the summary of codebase. Tell me which files you need the full version to do the following task";

export const DEFAULT_PROMPT_2 = "This is the code";

export function buildOutput(
  prompt: string,
  additionalPrompt: string,
  files: { path: string; content: string }[],
  footer: string,
  fullContextFiles: Set<string>,
): string {
  const parts: string[] = [];
  parts.push(footer);
  parts.push("");

  const fullPrompt = additionalPrompt.trim()
    ? `${prompt}\n${additionalPrompt.trim()}`
    : prompt;

  parts.push("PROMPT:");
  parts.push(fullPrompt);
  parts.push("");
  parts.push(
    "================================================================================",
  );
  parts.push("");

  for (const f of files) {
    parts.push(`# FILE: ${f.path}`);
    const body = fullContextFiles.has(f.path)
      ? f.content
      : summarizeFile(f.path, f.content);
    parts.push(body);
    parts.push("");
    parts.push(
      "================================================================================",
    );
    parts.push("");
  }

  return parts.join("\n");
}
