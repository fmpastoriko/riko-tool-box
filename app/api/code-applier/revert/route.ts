import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireLocal } from "@/lib/localGuard";
import { validateFileWrite } from "@/lib/validateFileWrite";
import { prettifiedResponse, internalError } from "@/lib/apiUtils";
import { runPrettier } from "@/lib/prettierFile";

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

    const validated = validateFileWrite(repoPath, filePath);
    if ("error" in validated) return validated.error;
    const { abs } = validated;

    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        { error: "Backup file not found" },
        { status: 404 },
      );
    }

    fs.copyFileSync(backupPath, abs);
    const prettified = runPrettier(abs, repoPath);
    return prettifiedResponse(prettified !== null && prettified !== undefined);
  } catch {
    return internalError();
  }
}
