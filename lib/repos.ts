import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "config", "repos.config.json");

export function getAllowedRepoPaths(): string[] {
  try {
    const repos: { label: string; path: string }[] = JSON.parse(
      fs.readFileSync(CONFIG_PATH, "utf-8"),
    );
    return repos.map((r) => r.path);
  } catch {
    return [];
  }
}

export function resolveFilePath(
  repoPath: string,
  filePath: string,
): string | null {
  const abs = path.join(repoPath, filePath);
  if (!abs.startsWith(repoPath + path.sep) && abs !== repoPath) return null;
  return abs;
}

export function isRepoAllowed(repoPath: string): boolean {
  return getAllowedRepoPaths().includes(repoPath);
}
