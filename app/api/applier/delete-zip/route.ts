import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";
const ALLOWED_DIR = process.env.DOWNLOADS_DIR ?? "/home/hana/Downloads";

export async function DELETE(req: NextRequest) {
  if (!IS_LOCAL) {
    return NextResponse.json(
      { error: "This endpoint is only available in local mode" },
      { status: 403 },
    );
  }

  try {
    const { filenames } = (await req.json()) as { filenames: string[] };

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { error: "filenames required" },
        { status: 400 },
      );
    }

    for (const filename of filenames) {
      if (!filename || filename.includes("/") || filename.includes("..")) {
        return NextResponse.json(
          { error: "Invalid filename" },
          { status: 400 },
        );
      }

      const abs = path.join(ALLOWED_DIR, filename);

      if (!abs.startsWith(ALLOWED_DIR + path.sep) && abs !== ALLOWED_DIR) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
      }

      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
