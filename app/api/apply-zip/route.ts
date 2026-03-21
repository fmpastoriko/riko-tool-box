import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isRepoAllowed, resolveFilePath } from "@/lib/repos";
import { ALLOWED_WRITE_EXTS } from "@/config/fileExtensions";
import { runPrettier } from "@/lib/prettierFile";

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";

export async function POST(req: NextRequest) {
  if (!IS_LOCAL) {
    return NextResponse.json(
      { error: "This endpoint is only available in local mode" },
      { status: 403 },
    );
  }

  try {
    const { repoPath, filePath, content } = (await req.json()) as {
      repoPath: string;
      filePath: string;
      content: string;
    };

    if (!repoPath || !filePath || content === undefined) {
      return NextResponse.json(
        { error: "repoPath, filePath, and content are required" },
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

    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf-8");

    const prettified = runPrettier(abs, repoPath);

    return NextResponse.json({ ok: true, prettified });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
