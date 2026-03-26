import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { validateFileWrite } from "@/lib/validateFileWrite";
import { internalError } from "@/lib/apiUtils";
import { runPrettier } from "@/lib/prettierFile";

export async function POST(req: NextRequest) {
  const guard = requireLocal();
  if (guard) return guard;

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

    const validated = validateFileWrite(repoPath, filePath);
    if ("error" in validated) return validated.error;
    const { abs } = validated;

    const tmpDir = "/tmp/code-applier-backup";
    fs.mkdirSync(tmpDir, { recursive: true });
    const timestamp = Date.now();
    const safeName = filePath.replace(/\//g, "!@#");
    const backupPath = path.join(tmpDir, `${timestamp}_${safeName}`);

    if (fs.existsSync(abs)) {
      fs.copyFileSync(abs, backupPath);
    }

    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf-8");
    const prettified = runPrettier(abs, repoPath);

    return NextResponse.json({
      ok: true,
      backupPath,
      prettified: prettified !== null && prettified !== undefined,
    });
  } catch {
    return internalError();
  }
}
