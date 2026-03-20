import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isRepoAllowed, resolveFilePath } from "@/lib/repos";
import { ALLOWED_WRITE_EXTS } from "@/config/fileExtensions";

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";

function normalizeIndent(text: string): string {
  const lines = text.split("\n");
  const minIndent = lines
    .filter((l) => l.trim().length > 0)
    .reduce((min, l) => {
      const indent = l.match(/^(\s*)/)?.[1].length ?? 0;
      return Math.min(min, indent);
    }, Infinity);
  if (minIndent === Infinity || minIndent === 0) return text;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

function findAndReplace(
  original: string,
  from: string,
  to: string,
): string | null {
  if (original.includes(from)) {
    return original.split(from).join(to);
  }
  const fromNorm = normalizeIndent(from.trimEnd());
  const lines = original.split("\n");
  const fromLines = fromNorm.split("\n");
  const fromLen = fromLines.length;
  for (let i = 0; i <= lines.length - fromLen; i++) {
    const slice = lines.slice(i, i + fromLen);
    const sliceNorm = normalizeIndent(slice.join("\n"));
    if (sliceNorm === fromNorm) {
      const originalBlock = lines.slice(i, i + fromLen).join("\n");
      const baseIndent = originalBlock.match(/^(\s*)/)?.[1] ?? "";
      const toIndented = to
        .split("\n")
        .map((l, idx) => (idx === 0 ? l : baseIndent + l))
        .join("\n");
      return (
        original.slice(0, original.indexOf(originalBlock)) +
        toIndented +
        original.slice(original.indexOf(originalBlock) + originalBlock.length)
      );
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!IS_LOCAL) {
    return NextResponse.json(
      { error: "This endpoint is only available in local mode" },
      { status: 403 },
    );
  }

  try {
    const { repoPath, filePath, from, to } = (await req.json()) as {
      repoPath: string;
      filePath: string;
      from: string;
      to: string;
    };

    if (!repoPath || !filePath || from === undefined || to === undefined) {
      return NextResponse.json(
        { error: "repoPath, filePath, from, and to are required" },
        { status: 400 },
      );
    }

    if (!isRepoAllowed(repoPath)) {
      return NextResponse.json(
        { error: "Repo not in allowlist" },
        { status: 403 },
      );
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!ALLOWED_WRITE_EXTS.has(ext)) {
      return NextResponse.json(
        { error: "File type not allowed for writing" },
        { status: 403 },
      );
    }

    const abs = resolveFilePath(repoPath, filePath);
    if (!abs) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    if (!fs.existsSync(abs)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const original = fs.readFileSync(abs, "utf-8");
    const updated = findAndReplace(original, from, to);

    if (updated === null) {
      return NextResponse.json(
        { error: "From snippet not found in file" },
        { status: 422 },
      );
    }

    fs.writeFileSync(abs, updated, "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
