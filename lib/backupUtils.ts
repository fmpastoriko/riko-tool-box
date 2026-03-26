import fs from "fs";
import path from "path";

export const BACKUP_DIR = "/tmp/code-backup";
export const MAX_BACKUPS_PER_FILE = 10;

export type BackupSource = "ca" | "cb";

export interface BackupEntry {
  backupPath: string;
  filePath: string;
  timestamp: number;
  source: BackupSource;
}

export function pruneOldBackups(fileDir: string): void {
  try {
    if (!fs.existsSync(fileDir)) return;
    const files = fs.readdirSync(fileDir);
    const matching = files
      .filter((f) => {
        const match = f.match(/^(\d+)_(ca|cb)$/);
        return !!match;
      })
      .map((f) => {
        const match = f.match(/^(\d+)_(ca|cb)$/);
        return { filename: f, timestamp: parseInt(match![1], 10) };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    for (const entry of matching.slice(MAX_BACKUPS_PER_FILE)) {
      try {
        fs.unlinkSync(path.join(fileDir, entry.filename));
      } catch {}
    }
  } catch {}
}

export function createBackup(
  abs: string,
  filePath: string,
  source: BackupSource = "ca",
): string | null {
  try {
    if (!fs.existsSync(abs)) return null;
    const fileDir = path.join(BACKUP_DIR, filePath);
    fs.mkdirSync(fileDir, { recursive: true });
    const timestamp = Date.now();
    const backupPath = path.join(fileDir, `${timestamp}_${source}`);
    fs.copyFileSync(abs, backupPath);
    pruneOldBackups(fileDir);
    return backupPath;
  } catch {
    return null;
  }
}
