export type ToolIcon =
  | "chatbot"
  | "codebriefer"
  | "textcompare"
  | "zipapply"
  | "comingsoon";

export interface ToolConfig {
  href: string;
  label: string;
  description: string;
  demonstrates: string[];
  mediumUrl?: string;
  localOnly?: boolean;
  highlight?: boolean;
  icon: ToolIcon;
}

export const TOOLS_CONFIG: ToolConfig[] = [
  {
    href: "/tools/chatbot",
    label: "Chatbot",
    icon: "chatbot",
    highlight: true,
    description:
      "Chat with a local LLM via Ollama. Sessions saved to DB, 100 message cap per session, 10 sessions max.",
    demonstrates: ["Ollama", "Streaming", "Local LLM", "DB"],
    mediumUrl:
      "https://medium.com/@fransiskuspastoriko/i-built-an-ai-toolbox-to-reduce-my-claude-usage-835c73bd7676",
  },
  {
    href: "/tools/code-briefer",
    label: "Code Briefer",
    icon: "codebriefer",
    highlight: true,
    description:
      "Join code files from a local repo, prepend a prompt, and output a single context-ready block for any LLM. Smart Select uses Ollama + Qwen to auto-pick relevant files.",
    demonstrates: ["Ollama / Qwen", "File tree", "AI integration", "DB"],
    mediumUrl:
      "https://medium.com/@fransiskuspastoriko/i-built-an-ai-toolbox-to-reduce-my-claude-usage-835c73bd7676",
  },
  {
    href: "/tools/text-compare",
    label: "Text Compare",
    icon: "textcompare",
    highlight: true,
    description:
      "Paste two text blocks and see exactly what changed; side-by-side split view with inline character diff. Save comparisons and share via permalink.",
    demonstrates: ["Myers diff", "jsdiff", "Save & Share", "DB"],
    mediumUrl:
      "https://medium.com/@fransiskuspastoriko/i-built-my-own-text-diff-tool-because-i-dont-trust-the-internet-with-my-data-4f28c4d0474c",
  },
  {
    href: "/tools/zip-apply",
    label: "Zip Apply",
    icon: "zipapply",
    highlight: true,
    localOnly: true,
    description:
      "Upload a zip, pick which files to apply, and write them directly into a local repo. Runs Prettier automatically after writing. Disabled for the Vercel version because it writes to your local files — clone the repo for this one.",
    demonstrates: ["File writes", "Prettier", "Local only"],
  },
];

export const MAX_HIGHLIGHTED = 6;
