import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { validateFileWrite } from "@/lib/validateFileWrite";
import { prettifiedResponse, internalError } from "@/lib/apiUtils";
import { runPrettier } from "@/lib/prettierFile";
import { BACKUP_DIR } from "@/lib/backupUtils";

export async function POST(req: NextRequest) {
  const guard = requireLocal();
  if (guard) return guard;

  try {
    const { repoPath, filePath, backupPath } = (await req.json()) as {
      repoPath: string;
      filePath: string;
      backupPath: string;
    };

    if (!repoPath || !filePath || !backupPath) {
      return NextResponse.json(
        { error: "repoPath, filePath, and backupPath are required" },
        { status: 400 },
      );
    }

    const resolvedBackup = path.resolve(backupPath);
    const resolvedDir = path.resolve(BACKUP_DIR);
    if (!resolvedBackup.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json(
        { error: "Invalid backup path" },
        { status: 400 },
      );
    }

    const validated = validateFileWrite(repoPath, filePath);
    if ("error" in validated) return validated.error;
    const { abs } = validated;

    if (!fs.existsSync(resolvedBackup)) {
      return NextResponse.json(
        { error: "Backup file not found" },
        { status: 404 },
      );
    }

    fs.copyFileSync(resolvedBackup, abs);
    const prettified = runPrettier(abs, repoPath);
    return prettifiedResponse(prettified !== null && prettified !== undefined);
  } catch {
    return internalError();
  }
}
