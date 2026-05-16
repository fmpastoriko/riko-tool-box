import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireLocal } from "@/lib/localGuard";
import { isRepoAllowed, resolveFilePath } from "@/lib/repos";
import { internalError } from "@/lib/apiUtils";

const MAX_FILE_SIZE = 500 * 1024;
const BLOCKED_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
]);

export async function POST(req: NextRequest) {
  const guard = requireLocal();
  if (guard) return guard;

  try {
    const { repoPath, filePaths } = (await req.json()) as {
      repoPath: string;
      filePaths: string[];
    };

    if (!repoPath || !Array.isArray(filePaths)) {
      return NextResponse.json(
        { error: "repoPath and filePaths required" },
        { status: 400 },
      );
    }

    if (!isRepoAllowed(repoPath)) {
      return NextResponse.json(
        { error: "Repo not in allowlist" },
        { status: 403 },
      );
    }

    const results: { path: string; content: string; skipped?: boolean }[] = [];

    for (const filePath of filePaths.slice(0, 200)) {
      const filename = filePath.split("/").pop() ?? "";
      if (BLOCKED_FILENAMES.has(filename)) {
        results.push({ path: filePath, content: "", skipped: true });
        continue;
      }
      const abs = resolveFilePath(repoPath, filePath);
      if (!abs) {
        results.push({ path: filePath, content: "", skipped: true });
        continue;
      }
      try {
        const stat = fs.statSync(abs);
        if (stat.size > MAX_FILE_SIZE) {
          results.push({ path: filePath, content: "", skipped: true });
          continue;
        }
        const content = fs.readFileSync(abs, "utf-8");
        results.push({ path: filePath, content });
      } catch {
        results.push({ path: filePath, content: "", skipped: true });
      }
    }

    return NextResponse.json({ files: results });
  } catch {
    return internalError();
  }
}
