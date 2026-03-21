import { execSync } from "child_process";

export function runPrettier(abs: string, repoPath: string): boolean {
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
