import ToolCard from "@/components/ToolCard";
import Footer from "@/components/Footer";

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
];

export default function ToolsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-8">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </div>
      <Footer />
    </div>
  );
}
