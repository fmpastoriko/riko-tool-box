export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
