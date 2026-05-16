import { execFileSync } from "child_process";
import path from "path";

const NEEDS_PLUGIN: Record<string, string[]> = {
  ".vue": ["@prettier/plugin-vue"],
};

function tryPrettier(abs: string, repoPath: string, plugins: string[]): boolean {
  const args = ["prettier", "--write", ...plugins.flatMap((p) => ["--plugin", p]), abs];
  try {
    execFileSync("npx", args, {
      cwd: repoPath,
      timeout: 20000,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

export function runPrettier(abs: string, repoPath: string): boolean {
  const ext = path.extname(abs).toLowerCase();
  if (tryPrettier(abs, repoPath, [])) return true;
  const plugins = NEEDS_PLUGIN[ext];
  if (plugins && tryPrettier(abs, repoPath, plugins)) return true;
  return false;
}
