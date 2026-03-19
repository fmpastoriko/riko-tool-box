import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isRepoAllowed, resolveFilePath } from "@/lib/repos";

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";

const ALLOWED_WRITE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".vue", ".css", ".scss", ".sql", ".json",
  ".md", ".html", ".yaml", ".yml", ".toml", ".txt",
]);

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
      return NextResponse.json({ error: "Repo not in allowlist" }, { status: 403 });
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

    const occurrences = original.split(from).length - 1;
    if (occurrences === 0) {
      return NextResponse.json(
        { error: "From snippet not found in file" },
        { status: 422 },
      );
    }
    if (occurrences > 1) {
      return NextResponse.json(
        { error: "From snippet is ambiguous (found multiple times)" },
        { status: 422 },
      );
    }

    const updated = original.replace(from, to);
    fs.writeFileSync(abs, updated, "utf-8");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
