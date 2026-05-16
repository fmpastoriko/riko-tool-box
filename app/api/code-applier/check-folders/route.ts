import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { isRepoAllowed } from "@/lib/repos";
import { internalError } from "@/lib/apiUtils";

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

    const newFolders = new Set<string>();

    for (const filePath of filePaths) {
      const dir = path.dirname(filePath);
      if (dir === "." || dir === "") continue;
      const absDir = path.join(repoPath, dir);
      const resolvedRepo = path.resolve(repoPath);
      const resolvedDir = path.resolve(absDir);
      if (
        !resolvedDir.startsWith(resolvedRepo + path.sep) &&
        resolvedDir !== resolvedRepo
      ) {
        continue;
      }
      if (!fs.existsSync(absDir)) {
        newFolders.add(dir);
      }
    }

    return NextResponse.json({ newFolders: Array.from(newFolders) });
  } catch {
    return internalError();
  }
}
