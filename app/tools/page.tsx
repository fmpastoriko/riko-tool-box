import ToolCard from "@/components/ToolCard";

const tools = [
  {
    href: "/tools/text-compare",
    title: "Text Compare",
    description:
      "Paste two text blocks and see exactly what changed — side-by-side split view with inline character diff. Save comparisons and share via permalink.",
    demonstrates: ["Myers diff", "jsdiff", "Save & Share", "DB"],
    mediumUrl:
      "https://medium.com/@fransiskuspastoriko/i-built-my-own-text-diff-tool-because-i-dont-trust-the-internet-with-my-data-4f28c4d0474c",
  },
  {
    href: "/tools/code-briefer",
    title: "Code Briefer",
    description:
      "Join code files from a local repo, prepend a prompt, and output a single context-ready block for any LLM. Smart Select uses Ollama + Qwen to auto-pick relevant files.",
    demonstrates: ["Ollama / Qwen", "File tree", "AI integration", "DB"],
    mediumUrl:
      "https://medium.com/@fransiskuspastoriko/i-built-an-ai-toolbox-because-free-claude-has-a-limit-a711db0d8932",
  },
  {
    href: "/tools/chatbot",
    title: "Chatbot",
    description:
      "Chat with a local LLM via Ollama. Sessions saved to DB, 100 message cap per session, 10 sessions max.",
    demonstrates: ["Ollama", "Streaming", "Local LLM", "DB"],
    mediumUrl:
      "https://medium.com/@fransiskuspastoriko/i-built-an-ai-toolbox-because-free-claude-has-a-limit-a711db0d8932",
  },
];

export default function ToolsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 sm:px-0 pt-4 sm:pt-0 pb-4">
        <p className="section-label">Toolbox</p>
        <h1
          className="text-2xl sm:text-3xl font-bold"
          style={{ color: "var(--primary)" }}
        >
          Interactive Tools
        </h1>
        <p
          className="text-sm mt-2 max-w-xl"
          style={{ color: "var(--secondary)" }}
        >
          Each tool is a working system. Click Medium ↗ to read the thinking
          behind each one.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-0 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <ToolCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </div>
  );
}
