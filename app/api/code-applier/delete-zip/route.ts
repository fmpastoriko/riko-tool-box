import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { internalError } from "@/lib/apiUtils";

const ALLOWED_DIR = process.env.DOWNLOADS_DIR ?? "/home/hana/Downloads";
const SAFE_FILENAME_RE = /^[a-zA-Z0-9_.\-]+$/;

export async function DELETE(req: NextRequest) {
  const guard = requireLocal();
  if (guard) return guard;

  try {
    const { filenames } = (await req.json()) as { filenames: string[] };

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { error: "filenames required" },
        { status: 400 },
      );
    }

    for (const filename of filenames) {
      if (!filename || !SAFE_FILENAME_RE.test(filename)) {
        return NextResponse.json(
          { error: "Invalid filename" },
          { status: 400 },
        );
      }

      const abs = path.join(ALLOWED_DIR, filename);
      const resolvedAllowed = path.resolve(ALLOWED_DIR);
      const resolvedAbs = path.resolve(abs);

      if (!resolvedAbs.startsWith(resolvedAllowed + path.sep)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }

      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return internalError();
  }
}
