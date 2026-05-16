import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireLocal } from "@/lib/localGuard";
import { internalError } from "@/lib/apiUtils";
import {
  BACKUP_DIR,
  MAX_BACKUPS_PER_FILE,
  BackupSource,
  BackupEntry,
} from "@/lib/backupUtils";

function walkBackups(dir: string, baseDir: string): BackupEntry[] {
  const results: BackupEntry[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkBackups(fullPath, baseDir));
    } else {
      const match = entry.name.match(/^(\d+)_(ca|cb)$/);
      if (!match) continue;
      const timestamp = parseInt(match[1], 10);
      const source = match[2] as BackupSource;
      const filePath = path.relative(baseDir, dir);
      results.push({ backupPath: fullPath, filePath, timestamp, source });
    }
  }
  return results;
}

export async function GET() {
  const guard = requireLocal();
  if (guard) return guard;

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ backups: [] });
    }

    const backups = walkBackups(BACKUP_DIR, BACKUP_DIR);
    backups.sort((a, b) => b.timestamp - a.timestamp);

    const perFile = new Map<string, BackupEntry[]>();
    for (const b of backups) {
      if (!perFile.has(b.filePath)) perFile.set(b.filePath, []);
      const arr = perFile.get(b.filePath)!;
      if (arr.length < MAX_BACKUPS_PER_FILE) arr.push(b);
    }

    const pruned: BackupEntry[] = [];
    for (const arr of perFile.values()) pruned.push(...arr);
    pruned.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ backups: pruned });
  } catch {
    return internalError();
  }
}
