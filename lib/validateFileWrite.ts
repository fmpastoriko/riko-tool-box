import { NextResponse } from "next/server";
import path from "path";
import { isRepoAllowed, resolveFilePath } from "@/lib/repos";
import { ALLOWED_WRITE_EXTS } from "@/config/fileExtensions";

type ValidateSuccess = { abs: string; error?: never };
type ValidateFailure = { error: NextResponse; abs?: never };
type ValidateResult = ValidateSuccess | ValidateFailure;

export function validateFileWrite(
  repoPath: string,
  filePath: string,
): ValidateResult {
  if (!isRepoAllowed(repoPath)) {
    return {
      error: NextResponse.json(
        { error: "Repo not in allowlist" },
        { status: 403 },
      ),
    };
  }

  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_WRITE_EXTS.has(ext)) {
    return {
      error: NextResponse.json(
        { error: "File type not allowed for writing" },
        { status: 403 },
      ),
    };
  }

  const abs = resolveFilePath(repoPath, filePath);
  if (!abs) {
    return {
      error: NextResponse.json({ error: "Invalid file path" }, { status: 400 }),
    };
  }

  return { abs };
}
