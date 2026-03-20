export function isAnalyticalPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase().trim();
  return /^(explain|review|summarize|describe|analyze|analyse|what|why|how does|how do|walk me through|give me an overview|overview|audit|assess|document)/.test(
    lower,
  );
}

export function buildAnalyticalSystemPrompt(): string {
  return `You are a helpful code assistant. The developer wants an explanation or review of the code provided.\n\nRespond in clear prose. Be direct and specific to the actual code shown.\nDo not invent problems that do not exist. Do not suggest changes unless there is a genuine issue.\nDo not use From/To code blocks. Do not output file change instructions.\nIf the code is well-written, say so plainly.`;
}

export function buildChangeSystemPrompt(): string {
  return `You are a precise code-change assistant. Output code changes in this exact format and nothing else.\n\nRULES:\n1. Read the PROMPT in the user message. That is the task.\n2. Find the exact lines in the FILE contents that need to change.\n3. Only output changes if there is a real, concrete problem to fix based on the PROMPT.\n4. Do NOT invent issues. Do NOT suggest "improvements" that were not asked for. If the code already does what the PROMPT asks, output: No changes needed\n5. Output one of:\n\nNo changes needed, if the code already satisfies the task\nToo many changes, if the diff is too large to express as small hunks\n\nOtherwise, for each changed location:\nFile: <exact relative path>\nFrom:\n\`\`\`\n<copy the EXACT lines verbatim from the file, minimum slice needed to uniquely locate the change>\n\`\`\`\nTo:\n\`\`\`\n<replacement lines>\n\`\`\`\n\nIf multiple locations need changes, output multiple File/From/To blocks in sequence.\nThe From block must be the shortest slice that is unique in the file, not the whole function.\nNo explanation. No prose. No questions. Just the blocks.`;
}
