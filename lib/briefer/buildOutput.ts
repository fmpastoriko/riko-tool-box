import { summarizeFile } from "@/lib/summarize";
import { buildWarningsBlock } from "@/lib/briefer/llmPrompts";

const CAVEMAN_RULES =
  "---\n" +
  "name: caveman\n" +
  "description: >\n" +
  "  Ultra-compressed communication mode. Cuts token usage ~75% by speaking like caveman\n" +
  "  while keeping full technical accuracy. Supports intensity levels: lite, full (default), ultra,\n" +
  "  wenyan-lite, wenyan-full, wenyan-ultra.\n" +
  '  Use when user says "caveman mode", "talk like caveman", "use caveman", "less tokens",\n' +
  '  "be brief", or invokes /caveman. Also auto-triggers when token efficiency is requested.\n' +
  "---\n\n" +
  "Respond terse like smart caveman. All technical substance stay. Only fluff die.\n\n" +
  "## Persistence\n\n" +
  'ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: "stop caveman" / "normal mode".\n\n' +
  "Default: **full**. Switch: `/caveman lite|full|ultra`.\n\n" +
  "## Rules\n\n" +
  'Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.\n\n' +
  "Pattern: `[thing] [action] [reason]. [next step].`\n\n" +
  "Not: \"Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by...\"\n" +
  'Yes: "Bug in auth middleware. Token expiry check use `<` not `<=`. Fix:"\n\n' +
  "## Intensity\n\n" +
  "| Level | What change |\n" +
  "|-------|------------|\n" +
  "| **lite** | No filler/hedging. Keep articles + full sentences. Professional but tight |\n" +
  "| **full** | Drop articles, fragments OK, short synonyms. Classic caveman |\n" +
  "| **ultra** | Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, arrows for causality (X -> Y), one word when one word enough |\n\n" +
  "## Auto-Clarity\n\n" +
  "Drop caveman for: security warnings, irreversible action confirmations, multi-step sequences where fragment order risks misread. Resume caveman after clear part done.\n\n" +
  "## Boundaries\n\n" +
  'Code/commits/PRs: write normal. "stop caveman" or "normal mode": revert.';

const REVIEW_REMINDER = "REVIEW YOUR OUTPUT FIRST BEFORE PRESENTING IT TO ME";

const FOOTER_APPEND =
  "DO NOT ADD ANY COMMENTS.\n\n" +
  "IF THIS FILE IS A SUMMARY ONLY, ASK FOR COMPLETE CODES IF YOU NEED THEM.\n\n" +
  "THIS IS A MUST: To avoid ambiguity, if you create files, NAME THE FILES WITH THEIR PATH. " +
  'Example: app/tools/Page.tsx become "app!@#tools!@#page"\n\n' +
  "THIS IS A MUST: Output your code as files, not as text. I expect downloadable files like .ts, .tsx, .vue, etc.\n\n" +
  "THIS IS A MUST: Output how many tokens this message uses.\n\n" +
  "THIS IS A MUST: Output how many tokens your output uses.\n\n" +
  "THIS IS A MUST: EVERY FILE MUST BE NAMED USING ITS FULL PATH. NO BEING LAZY\n\n" +
  'THIS IS A MUST: DON\'T START CODING UNLESS I SAY "Start Coding"\n\n' +
  "THIS IS A MUST: Before doing anything, explain your plan first and ask for my permission and input.\n\n" +
  'THIS IS A MUST: Only start coding when I specifically reply with "Start Coding". ' +
  'This is strict, but case insensitive. Others like "Go", "Start", etc is not valid.\n\n' +
  "Return only code, no explanation unless asked.\n\n" +
  "Preserve existing code style and conventions.\n\n" +
  "Do not add placeholder comments like // TODO or // implement this.\n\n" +
  "If you need to tell me something, tell me through chat, not through comment.\n\n" +
  "If you are in doubt, always ask me first, do not assume.\n\n" +
  "Do not make up non-existent problems for the sake of feedback. If the code is good enough, say so.\n\n" +
  "Always keep in mind the security, efficiency/performance, and cost (money) of the changes you make.\n\n" +
  "SERIOUSLY, DO NOT USE M-DASH.\n\n" +
  CAVEMAN_RULES +
  "\n\n" +
  REVIEW_REMINDER;

const FOOTER_DEFAULT =
  'THIS IS A MUST: DON\'T START CODING UNLESS I SAY "Start Coding"\n\n' +
  REVIEW_REMINDER;

export const DEFAULT_PROMPT = "This is the code";

export const DEFAULT_PROMPT_2 =
  "This is either the summary of codebase or the complete codebase. " +
  "IF THIS IS THE SUMMARY, tell me which files you need the full version to do the following task";

export type ContextMode = "off" | "names" | "semi" | "full";

export function buildOutput(
  prompt: string,
  additionalPrompt: string,
  files: { path: string; content: string }[],
  footerMode: "full" | "none" | "default2" | "change" | "default1",
  fullContextFiles: Set<string>,
  contextMode: ContextMode = "full",
): string {
  const parts: string[] = [];

  if (footerMode === "full") {
    parts.push(FOOTER_APPEND);
    parts.push("");
  } else if (footerMode === "change") {
    parts.push(FOOTER_APPEND);
    parts.push("");
    parts.push(buildWarningsBlock());
    parts.push("");
  } else if (footerMode === "default2") {
    parts.push(FOOTER_DEFAULT);
    parts.push("");
  } else if (footerMode === "default1") {
    parts.push(REVIEW_REMINDER);
    parts.push("");
  }

  const fullPrompt = additionalPrompt.trim()
    ? `${prompt}\n${additionalPrompt.trim()}`
    : prompt;

  parts.push("PROMPT:");
  parts.push(fullPrompt);
  parts.push("");
  parts.push(
    "================================================================================",
  );
  parts.push("");

  for (const f of files) {
    parts.push(`# FILE: ${f.path}`);
    let body: string;
    if (fullContextFiles.has(f.path) || contextMode === "full") {
      body = f.content;
    } else if (contextMode === "off") {
      body = summarizeFile(f.path, f.content, "filename");
    } else if (contextMode === "names") {
      body = summarizeFile(f.path, f.content, "names");
    } else {
      body = summarizeFile(f.path, f.content, "semi");
    }
    parts.push(body);
    parts.push("");
    parts.push(
      "================================================================================",
    );
    parts.push("");
  }

  return parts.join("\n");
}
