export default function Footer() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <p
        className="text-center sm:text-right max-w-6xl mx-auto px-4 sm:px-6 py-2 text-xs font-mono"
        style={{ color: "var(--muted)" }}
      >
        made with Next.js · Tailwind · Neon · Vercel
      </p>
    </footer>
  );
}
