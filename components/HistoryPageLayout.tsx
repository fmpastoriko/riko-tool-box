"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatDate";
import Card from "@/components/Card";
import SectionLabel from "@/components/SectionLabel";
import StatusBadge from "@/components/StatusBadge";
import ErrorText from "@/components/ErrorText";
import MonoText from "@/components/MonoText";

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

      {loading && <MonoText color="muted">Loading…</MonoText>}
      {error && <ErrorText>{error}</ErrorText>}

      {items && (
        <div className="flex items-center gap-2">
          {authenticated ? (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "rgb(34,197,94)" }}
              />
              <MonoText color="muted" style={{ color: "rgb(34,197,94)" }}>
                Authenticated, showing real content
              </MonoText>
            </>
          ) : (
            <>
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--muted)" }}
              />
              <MonoText color="muted">
                Showing your {dataKey}, others are hidden
              </MonoText>
            </>
          )}
          <MonoText color="muted" className="ml-auto">
            {countLabel(items.length)}
          </MonoText>
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
            <Card
              key={item.id}
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
                <StatusBadge variant="border">
                  {item.id.slice(0, 8)}…
                </StatusBadge>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
