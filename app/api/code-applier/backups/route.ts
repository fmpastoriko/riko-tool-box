import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { internalError } from "@/lib/apiUtils";

const BACKUP_DIR = "/tmp/code-applier-backup";

export interface BackupEntry {
  backupPath: string;
  filePath: string;
  timestamp: number;
}

export async function GET() {
  const guard = requireLocal();
  if (guard) return guard;

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [] });
    }

    const files = fs.readdirSync(BACKUP_DIR);
    const backups: BackupEntry[] = [];

    for (const filename of files) {
      const match = filename.match(/^(\d+)_(.+)$/);
      if (!match) continue;
      const timestamp = parseInt(match[1], 10);
      const filePath = match[2].replace(/_/g, "/");
      backups.push({
        backupPath: path.join(BACKUP_DIR, filename),
        filePath,
        timestamp,
      });
    }

    backups.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ backups });
  } catch {
    return internalError();
  }
}
