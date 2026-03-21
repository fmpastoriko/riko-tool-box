import { execSync } from "child_process";
import path from "path";

const PRETTIER_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".scss",
  ".json",
  ".md",
  ".html",
  ".yaml",
  ".yml",
]);

export function runPrettier(abs: string, repoPath: string): boolean {
  const ext = path.extname(abs).toLowerCase();
  if (!PRETTIER_EXTS.has(ext)) return false;
  try {
    execSync(`npx prettier --write "${abs}"`, {
      cwd: repoPath,
      timeout: 15000,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}
