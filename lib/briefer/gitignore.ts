export function parseGitignore(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export function isIgnored(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const clean = pattern.replace(/\/$/, "");
    if (
      filePath === clean ||
      filePath.startsWith(clean + "/") ||
      filePath.split("/").includes(clean)
    ) {
      return true;
    }
    if (clean.startsWith("*.")) {
      const ext = clean.slice(1);
      if (filePath.endsWith(ext)) return true;
    }
    if (clean.startsWith("**/")) {
      const suffix = clean.slice(3);
      if (filePath.endsWith("/" + suffix) || filePath === suffix) return true;
    }
  }
  return false;
}
