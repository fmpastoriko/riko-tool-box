import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { validateFileWrite } from "@/lib/validateFileWrite";
import { internalError } from "@/lib/apiUtils";
import { runPrettier } from "@/lib/prettierFile";
import { createBackup, BackupSource } from "@/lib/backupUtils";

export async function POST(req: NextRequest) {
  const guard = requireLocal();
  if (guard) return guard;

  try {
    const { repoPath, filePath, content, source } = (await req.json()) as {
      repoPath: string;
      filePath: string;
      content: string;
      source?: BackupSource;
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

    const src: BackupSource = source === "cb" ? "cb" : "ca";
    const backupPath = createBackup(abs, filePath, src);

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