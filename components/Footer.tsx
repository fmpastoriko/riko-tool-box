export default function Footer() {
  return (
    <footer
      className="hidden sm:block fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p
        className="text-right max-w-6xl mx-auto px-6 py-2 text-xs font-mono"
        style={{ color: "var(--muted)" }}
      >
        made with Next.js · Tailwind · Neon · Vercel
      </p>
    </footer>
  );
}
