import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { validateFileWrite } from "@/lib/validateFileWrite";
import { prettifiedResponse, internalError } from "@/lib/apiUtils";
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

    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf-8");
    const prettified = runPrettier(abs, repoPath);
    return prettifiedResponse(prettified !== null && prettified !== undefined);
  } catch {
    return internalError();
  }
}
