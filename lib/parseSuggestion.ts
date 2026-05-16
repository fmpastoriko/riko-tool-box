export interface SuggestionBlock {
  filePath: string;
  from: string;
  to: string;
}

export function parseSuggestion(suggestion: string): SuggestionBlock[] {
  const blocks: SuggestionBlock[] = [];
  const blockRegex =
    /File:\s*(.+?)\nFrom:\n```[^\n]*\n([\s\S]*?)```\nTo:\n```[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = blockRegex.exec(suggestion)) !== null) {
    blocks.push({ filePath: match[1].trim(), from: match[2], to: match[3] });
  }
  return blocks;
}
