import ToolCard from "@/components/ToolCard";
import { TOOLS_CONFIG } from "@/config/tools";

const isLocal = process.env.NEXT_PUBLIC_LOCAL === "true";

const tools = TOOLS_CONFIG.filter((t) => !t.localOnly || isLocal);

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
            <ToolCard
              key={tool.href}
              href={tool.href}
              title={tool.label}
              description={tool.description}
              demonstrates={tool.demonstrates}
              mediumUrl={tool.mediumUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}