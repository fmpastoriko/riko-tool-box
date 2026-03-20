export function resolveFileNames(raw: string, allPaths: string[]): string[] {
  const candidates = raw.match(/[\w.\-/]+/g) ?? [];
  const result: string[] = [];

  for (const rawToken of candidates) {
    const token = rawToken.replace(/-/g, "/");
    const lower = token.toLowerCase();

    const exact = allPaths.find(
      (p) => p === token || p.toLowerCase() === lower,
    );
    if (exact) {
      result.push(exact);
      continue;
    }

    const bySuffix = allPaths.filter((p) => {
      const pLower = p.toLowerCase();
      return (
        pLower === lower ||
        pLower.endsWith("/" + lower) ||
        pLower.replace(/\.[^/.]+$/, "") === lower ||
        pLower.replace(/\.[^/.]+$/, "").endsWith("/" + lower)
      );
    });
    if (bySuffix.length >= 1) {
      result.push(...bySuffix);
      continue;
    }

    const byFilename = allPaths.filter(
      (p) => p.split("/").pop()?.toLowerCase() === lower,
    );
    if (byFilename.length === 1) {
      result.push(byFilename[0]);
      continue;
    }
    if (byFilename.length > 1) {
      result.push(...byFilename);
      continue;
    }

    const byPrefix = allPaths.filter((p) => {
      const noExt = p.toLowerCase().replace(/\.[^/.]+$/, "");
      return noExt === lower;
    });
    if (byPrefix.length === 1) result.push(byPrefix[0]);
    else if (byPrefix.length > 1) result.push(...byPrefix);
  }

  return [...new Set(result)].map((p) => p.replace(/\s/g, ""));
}
