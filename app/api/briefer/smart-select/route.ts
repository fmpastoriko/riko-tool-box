import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { getServerRole, isOwnerRole } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_FILES = 300;
const MAX_PROMPT_BYTES = 100 * 1024 * 1024;

type FileEntry = { path: string; content: string };

function stripMarkdown(text: string): string {
  return text
    .replace(/`/g, "")
    .replace(/\*+/g, "")
    .replace(/^[\s\-*•]+/gm, "");
}

async function layerLLM(
  prompt: string,
  files: FileEntry[],
  isOwner: boolean,
): Promise<string[]> {
  const fileList = files
    .map((f) => (!f.content.trim() ? null : `### ${f.path}\n${f.content}`))
    .filter(Boolean)
    .join("\n\n---\n\n");

  const fullPrompt = `You are a precise file selector helping a developer fix a bug or implement a change.

Given the file summaries below, select ONLY the files that must be directly edited to fulfill the task.

Rules:
- Return only files whose content would need to change.
- Do NOT return infrastructure, routing, or utility files unless the task explicitly targets them.
- Do NOT return files that are merely related by topic; only files that need edits.
- For UI/style bugs, prefer component and CSS files over API routes.
- Be minimal. Fewer is better.

${fileList}

---

Task: ${prompt}

Reply with only a JSON array of file paths. Example: ["app/tools/text-compare/page.tsx", "app/globals.css"]`;

  let raw = "";
  try {
    const result = await generateText(
      fullPrompt,
      isOwner,
      "llama-3.3-70b-versatile",
    );
    raw = result.text;
  } catch {
    return [];
  }

  const fenceMatch = raw.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  const bareMatch = raw.match(/\[[\s\S]*?\]/);
  const jsonStr = fenceMatch ? fenceMatch[1] : bareMatch ? bareMatch[0] : null;
  if (!jsonStr) return [];

  try {
    const selected: string[] = JSON.parse(jsonStr);
    const validPaths = files.map((f) => f.path);
    const validSet = new Set(validPaths);
    const mapped = selected.map((p) => {
      if (validSet.has(p)) return p;
      const lower = p.toLowerCase();
      const exact = validPaths.find((vp) => vp.toLowerCase() === lower);
      if (exact) return exact;
      const filename = p.split("/").pop()?.toLowerCase();
      if (!filename) return null;
      const byName = validPaths.filter(
        (vp) => vp.split("/").pop()?.toLowerCase() === filename,
      );
      return byName.length === 1 ? byName[0] : null;
    });
    return mapped.filter((p): p is string => p !== null);
  } catch {
    return [];
  }
}

function layerKeywords(prompt: string, paths: string[]): string[] {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "and",
    "or",
    "but",
    "not",
    "with",
    "this",
    "that",
    "it",
    "be",
    "are",
    "was",
    "fix",
    "bug",
    "error",
    "issue",
    "problem",
    "help",
    "need",
    "want",
    "make",
    "get",
    "set",
    "use",
    "add",
    "update",
    "change",
    "check",
    "file",
    "files",
    "code",
    "select",
    "when",
    "also",
    "even",
    "show",
    "should",
    "possible",
    "same",
    "time",
    "fill",
    "once",
    "dont",
    "still",
    "instead",
    "color",
    "colour",
  ]);
  const cleaned = stripMarkdown(prompt);
  const words = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\-_/[\]]/g, " ")
    .split(/[\s/]+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
  if (words.length === 0) return [];
  const scored = paths.map((p) => {
    const lower = p.toLowerCase();
    const segments = lower.split(/[/.\-_[\]]/);
    const score = words.reduce((acc, word) => {
      const segmentMatch = segments.some((s) => s === word) ? 2 : 0;
      const includesMatch = lower.includes(word) ? 1 : 0;
      return acc + Math.max(segmentMatch, includesMatch);
    }, 0);
    return { path: p, score };
  });
  const max = Math.max(...scored.map((s) => s.score));
  if (max === 0) return [];
  return scored
    .filter((s) => s.score >= Math.max(1, max - 1))
    .map((s) => s.path);
}

export async function POST(req: NextRequest) {
  const { allowed } = checkRateLimit(req, 20);
  if (!allowed)
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  try {
    const body = await req.text();
    if (Buffer.byteLength(body, "utf8") > MAX_PROMPT_BYTES) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 },
      );
    }
    const { prompt, files } = JSON.parse(body) as {
      prompt: string;
      files: FileEntry[];
    };
    if (!prompt || !Array.isArray(files)) {
      return NextResponse.json(
        { error: "prompt and files required" },
        { status: 400 },
      );
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files (max ${MAX_FILES})` },
        { status: 400 },
      );
    }
    const role = await getServerRole();
    const owner = isOwnerRole(role);
    const paths = files.map((f) => f.path);
    const llm = await layerLLM(prompt, files, owner);
    if (llm.length > 0) return NextResponse.json({ selected: llm, layer: 1 });
    const kw = layerKeywords(prompt, paths);
    return NextResponse.json({ selected: kw, layer: 2 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
