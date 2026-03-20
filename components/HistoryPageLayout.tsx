"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatDate";

interface BaseItem {
  id: string;
  created_at: string;
  is_own: boolean;
}

interface HistoryPageLayoutProps<T extends BaseItem> {
  title: string;
  subtitle: string;
  backHref: string;
  backLabel: string;
  fetchUrl: string;
  dataKey: string;
  countLabel: (n: number) => string;
  renderCardMeta: (item: T) => React.ReactNode;
  renderExpanded: (item: T) => React.ReactNode;
}

export default function HistoryPageLayout<T extends BaseItem>({
  title,
  subtitle,
  backHref,
  backLabel,
  fetchUrl,
  dataKey,
  countLabel,
  renderCardMeta,
  renderExpanded,
}: HistoryPageLayoutProps<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((data) => {
        setItems(data[dataKey]);
        setAuthenticated(data.authenticated);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [fetchUrl, dataKey]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: "var(--primary)" }}
          >
            {title}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--secondary)" }}>
            {subtitle}
          </p>
        </div>
        <Link
          href={backHref}
          className="btn-ghost text-xs py-1 px-3 flex-shrink-0"
        >
          {backLabel}
        </Link>
      </div>

      {loading && (
        <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>
          Loading…
        </p>
      )}
      {error && (
        <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>
          {error}
        </p>
      )}

      {items && (
        <div className="flex items-center gap-2">
          {authenticated ? (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "rgb(34,197,94)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "rgb(34,197,94)" }}
              >
                Authenticated, showing real content
              </span>
            </>
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--muted)" }}
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--muted)" }}
              >
                Showing your {dataKey}, others are hidden
              </span>
            </>
          )}
          <span
            className="text-xs font-mono ml-auto"
            style={{ color: "var(--muted)" }}
          >
            {countLabel(items.length)}
          </span>
        </div>
      )}

      {items && items.length === 0 && (
        <div
          className="rounded-xl py-14 text-center text-sm"
          style={{ border: "1px dashed var(--border)", color: "var(--muted)" }}
        >
          No {dataKey} saved yet
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                borderColor:
                  expanded === item.id ? "var(--accent)" : "var(--border)",
                opacity: item.is_own ? 1 : 0.4,
              }}
            >
              <button
                onClick={() =>
                  item.is_own &&
                  setExpanded(expanded === item.id ? null : item.id)
                }
                className="w-full text-left flex items-center gap-4 flex-wrap"
                disabled={!item.is_own}
              >
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{
                    background: "var(--border)",
                    color: "var(--secondary)",
                  }}
                >
                  {item.id.slice(0, 8)}…
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {formatDate(item.created_at)}
                </span>
                {item.is_own && renderCardMeta(item)}
                {item.is_own && (
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {expanded === item.id ? "▲" : "▼"}
                  </span>
                )}
              </button>
              {expanded === item.id && item.is_own && (
                <div className="mt-4">{renderExpanded(item)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
