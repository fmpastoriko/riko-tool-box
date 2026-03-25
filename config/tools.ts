export type ToolIconName =
  | "chatbot"
  | "codebriefer"
  | "textcompare"
  | "codeapplier"
  | "arithmeticpuzzle"
  | "wordsearch"
  | "comingsoon";

export interface ToolConfig {
  href: string;
  label: string;
  description: string;
  demonstrates: string[];
  mediumUrl?: string;
  localOnly?: boolean;
  localOnlyReason?: string;
  highlight?: boolean;
  hasHistory?: boolean;
  icon: ToolIconName;
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
    href: "/tools/code-applier",
    label: "Code Applier",
    icon: "codeapplier",
    highlight: true,
    localOnly: true,
    localOnlyReason:
      "Unavailable for the Vercel version because the whole purpose of this tool is to write directly to local files. This is quite risky to host. Kindly clone the repo if you want this feature.",
    description:
      "Upload a zip, pick which files to apply, and write them directly into a local repo. Runs Prettier automatically after writing. Disabled for the Vercel version because it writes to your local files — clone the repo for this one.",
    demonstrates: ["File writes", "Prettier", "Local only"],
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
    href: "/tools/arithmetic-puzzle",
    label: "Arithmetic Puzzle",
    icon: "arithmeticpuzzle",
    highlight: true,
    hasHistory: true,
    description:
      "Generate printable arithmetic crossword puzzles with branching equation chains. Configure operators, number range, difficulty, and chain depth. Download as PDF with answer key.",
    demonstrates: ["Puzzle generation", "PDFKit", "DB"],
  },
  {
    href: "/tools/word-search",
    label: "Word Search",
    icon: "wordsearch",
    highlight: true,
    hasHistory: true,
    description:
      "Generate printable Indonesian word search puzzles by topic. AI generates contextually relevant words via Groq, placed on a grid with backtracking. Download as PDF with answer key.",
    demonstrates: ["Groq AI", "Backtracking", "PDFKit", "DB"],
  },
];

export const MAX_HIGHLIGHTED = 6;
