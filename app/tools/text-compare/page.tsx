"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { diffLines, diffChars, type Change } from "diff";
import Link from "next/link";

type Side = {
  text: string;
  type: "equal" | "added" | "removed";
  lineNum: number;
} | null;

function reconcilePairs(
  pairs: { left: Side; right: Side }[],
): { left: Side; right: Side }[] {
  return pairs.map((pair) => {
    const { left, right } = pair;
    if (
      left?.type === "removed" &&
      right?.type === "added" &&
      left.text === right.text
    ) {
      return {
        left: { ...left, type: "equal" },
        right: { ...right, type: "equal" },
      };
    }
    return pair;
  });
}

function buildSideBySide(changes: Change[]) {
  const left: Side[] = [],
    right: Side[] = [];
  let la = 1,
    lb = 1;
  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n");
    if (!change.added && !change.removed) {
      for (const text of lines) {
        left.push({ text, type: "equal", lineNum: la++ });
        right.push({ text, type: "equal", lineNum: lb++ });
      }
    } else if (change.removed) {
      for (const text of lines)
        left.push({ text, type: "removed", lineNum: la++ });
    } else {
      for (const text of lines)
        right.push({ text, type: "added", lineNum: lb++ });
    }
  }
  const pairs: { left: Side; right: Side }[] = [];
  let li = 0,
    ri = 0;
  while (li < left.length || ri < right.length) {
    const l = left[li] ?? null,
      r = right[ri] ?? null;
    if (l?.type === "equal" && r?.type === "equal") {
      pairs.push({ left: l, right: r });
      li++;
      ri++;
    } else {
      const removed: Side[] = [],
        added: Side[] = [];
      while (li < left.length && left[li]?.type !== "equal")
        removed.push(left[li++]);
      while (ri < right.length && right[ri]?.type !== "equal")
        added.push(right[ri++]);
      const len = Math.max(removed.length, added.length);
      for (let k = 0; k < len; k++)
        pairs.push({ left: removed[k] ?? null, right: added[k] ?? null });
    }
  }
  return reconcilePairs(pairs);
}

type Span = { text: string; changed: boolean };

function inlineSpans(
  original: string,
  modified: string,
): { left: Span[]; right: Span[] } {
  const chars = diffChars(original, modified);
  const left: Span[] = [],
    right: Span[] = [];
  for (const c of chars) {
    if (!c.added && !c.removed) {
      left.push({ text: c.value, changed: false });
      right.push({ text: c.value, changed: false });
    } else if (c.removed) left.push({ text: c.value, changed: true });
    else right.push({ text: c.value, changed: true });
  }
  return { left, right };
}

function LineNum({ n }: { n: number | undefined }) {
  return (
    <span
      className="select-none text-right w-9 flex-shrink-0 pr-2 font-mono text-xs leading-5"
      style={{ color: "var(--muted)" }}
    >
      {n ?? ""}
    </span>
  );
}

function DiffRow({ leftSide, rightSide }: { leftSide: Side; rightSide: Side }) {
  const bothChanged =
    leftSide?.type === "removed" && rightSide?.type === "added";
  const { left: lSpans, right: rSpans } = useMemo(
    () =>
      bothChanged
        ? inlineSpans(leftSide!.text, rightSide!.text)
        : { left: [], right: [] },
    [bothChanged, leftSide?.text, rightSide?.text],
  );

  function renderCell(side: Side, spans: Span[], isLeft: boolean) {
    if (!side)
      return (
        <div
          className="flex py-0.5 flex-1 min-w-0"
          style={{ background: "var(--border)" }}
        >
          <LineNum n={undefined} />
        </div>
      );
    const isAdded = side.type === "added",
      isRemoved = side.type === "removed";
    const bg = isAdded
      ? "rgba(34,197,94,0.08)"
      : isRemoved
        ? "rgba(239,68,68,0.08)"
        : "transparent";
    const baseColor = isAdded
      ? "rgba(34,197,94,0.9)"
      : isRemoved
        ? "rgba(239,68,68,0.9)"
        : "var(--secondary)";
    const hlBg = isLeft ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)";
    const prefix = isAdded ? "+" : isRemoved ? "−" : "";
    const prefixColor = isAdded
      ? "rgba(34,197,94,0.7)"
      : isRemoved
        ? "rgba(239,68,68,0.7)"
        : "transparent";
    return (
      <div
        className="flex items-baseline py-0.5 flex-1 min-w-0 font-mono text-xs"
        style={{ background: bg }}
      >
        <LineNum n={side.lineNum} />
        <span
          className="w-4 flex-shrink-0 select-none"
          style={{ color: prefixColor }}
        >
          {prefix}
        </span>
        <span
          className="whitespace-pre overflow-hidden flex-1"
          style={{ color: baseColor }}
        >
          {bothChanged && spans.length > 0
            ? spans.map((s, i) =>
                s.changed ? (
                  <mark
                    key={i}
                    style={{
                      background: hlBg,
                      color: "inherit",
                      borderRadius: 2,
                    }}
                  >
                    {s.text}
                  </mark>
                ) : (
                  <span key={i}>{s.text}</span>
                ),
              )
            : side.text || " "}
        </span>
      </div>
    );
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "1fr 1fr",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex overflow-hidden min-w-0">
        {renderCell(leftSide, lSpans, true)}
      </div>
      <div
        className="flex overflow-hidden min-w-0 border-l"
        style={{ borderColor: "var(--border)" }}
      >
        {renderCell(rightSide, rSpans, false)}
      </div>
    </div>
  );
}

async function autoSave(textA: string, textB: string): Promise<string | null> {
  try {
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text_a: textA, text_b: textB }),
    });
    if (!res.ok) return null;
    const { id } = await res.json();
    return id as string;
  } catch {
    return null;
  }
}

export default function TextComparePage() {
  return (
    <Suspense>
      <TextCompareInner />
    </Suspense>
  );
}

function TextCompareInner() {
  const searchParams = useSearchParams();
  const [left, setLeft] = useState(() => searchParams.get("a") ?? "");
  const [right, setRight] = useState(() => searchParams.get("b") ?? "");
  const [mode, setMode] = useState<"split" | "unified">("split");
  const [savedId, setSavedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changes = useMemo(
    () => (left || right ? diffLines(left, right) : []),
    [left, right],
  );
  const pairs = useMemo(() => buildSideBySide(changes), [changes]);

  useEffect(() => {
    if (!left || !right) return;
    setSavedId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const id = await autoSave(left, right);
      if (id) setSavedId(id);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [left, right]);

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap flex-shrink-0">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            Text Compare
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--secondary)" }}>
            Myers diff; side-by-side with inline character highlighting.{" "}
            <a
              href="https://medium.com/@fransiskuspastoriko/i-built-my-own-text-diff-tool-because-i-dont-trust-the-internet-with-my-data-4f28c4d0474c"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
              className="underline"
            >
              Read why ↗
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
            {left &&
              right &&
              (savedId ? (
                <span style={{ color: "rgb(34,197,94)" }}>✓ saved</span>
              ) : (
                <span>saving…</span>
              ))}
          </div>
          <Link
            href="/tools/text-compare/history"
            className="btn-ghost text-xs py-1 px-3"
          >
            History ↗
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
        {(
          [
            {
              label: "First Text",
              value: left,
              set: setLeft,
              placeholder: "Paste first text...",
            },
            {
              label: "Second Text",
              value: right,
              set: setRight,
              placeholder: "Paste second text...",
            },
          ] as const
        ).map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <p
              className="text-xs font-mono mb-1.5"
              style={{ color: "var(--muted)" }}
            >
              {label}
            </p>
            <textarea
              className="input-base h-36"
              placeholder={placeholder}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </div>
        ))}
      </div>

      {changes.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          <div className="flex justify-end flex-shrink-0">
            <div className="flex gap-1.5">
              {(["split", "unified"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="text-xs px-3 py-1 rounded border capitalize transition-colors"
                  style={{
                    borderColor: mode === m ? "var(--accent)" : "var(--border)",
                    color: mode === m ? "var(--accent)" : "var(--secondary)",
                    background:
                      mode === m ? "var(--accent-dim)" : "transparent",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex-1 rounded-xl overflow-hidden flex flex-col min-h-0"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            {mode === "split" ? (
              <div className="flex-1 overflow-auto">
                <div
                  className="grid text-xs font-mono py-1.5 border-b sticky top-0"
                  style={{
                    gridTemplateColumns: "1fr 1fr",
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <span className="pl-11" style={{ color: "var(--muted)" }}>
                    First Text
                  </span>
                  <span
                    className="pl-11 border-l"
                    style={{
                      color: "var(--muted)",
                      borderColor: "var(--border)",
                    }}
                  >
                    Second Text
                  </span>
                </div>
                {pairs.map((pair, i) => (
                  <DiffRow
                    key={i}
                    leftSide={pair.left}
                    rightSide={pair.right}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                {changes.map((change, ci) => {
                  const lines = change.value.replace(/\n$/, "").split("\n");
                  const isAdded = !!change.added,
                    isRemoved = !!change.removed;
                  const bg = isAdded
                    ? "rgba(34,197,94,0.08)"
                    : isRemoved
                      ? "rgba(239,68,68,0.08)"
                      : "transparent";
                  const color = isAdded
                    ? "rgba(34,197,94,0.9)"
                    : isRemoved
                      ? "rgba(239,68,68,0.9)"
                      : "var(--secondary)";
                  const prefix = isAdded ? "+" : isRemoved ? "−" : " ";
                  return lines.map((text, li) => (
                    <div
                      key={`${ci}-${li}`}
                      className="flex items-baseline py-0.5 font-mono text-xs border-b"
                      style={{ background: bg, borderColor: "var(--border)" }}
                    >
                      <span
                        className="select-none text-right w-9 flex-shrink-0 pr-2"
                        style={{ color: "var(--muted)" }}
                      />
                      <span
                        className="w-4 flex-shrink-0 select-none"
                        style={{
                          color: isAdded
                            ? "rgba(34,197,94,0.7)"
                            : isRemoved
                              ? "rgba(239,68,68,0.7)"
                              : "transparent",
                        }}
                      >
                        {prefix}
                      </span>
                      <span className="whitespace-pre" style={{ color }}>
                        {text || " "}
                      </span>
                    </div>
                  ));
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!left && !right && (
        <div
          className="flex-1 rounded-xl flex items-center justify-center text-sm"
          style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
        >
          Paste text in both panels to see the diff
        </div>
      )}
    </div>
  );
}
