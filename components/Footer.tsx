export default function Footer() {
  return (
    <footer className="border-t mt-20" style={{ borderColor: "var(--border)" }}>
      <div
        className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between text-xs font-mono flex-wrap gap-3"
        style={{ color: "var(--muted)" }}
      >
        <span>riko.toolbox</span>
        <span>{"made with Next.js · Tailwind · Neon · Vercel"}</span>
      </div>
    </footer>
  );
}
