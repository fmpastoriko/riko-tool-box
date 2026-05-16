export default function MobileNotOptimized() {
  return (
    <div className="flex-1 flex items-center justify-center text-center px-6">
      <div>
        <p className="text-2xl mb-3">💻</p>
        <p className="font-mono text-sm" style={{ color: "var(--primary)" }}>
          Not optimized for phone.
        </p>
        <p className="font-mono text-xs mt-1" style={{ color: "var(--muted)" }}>
          Open at computer.
        </p>
      </div>
    </div>
  );
}
