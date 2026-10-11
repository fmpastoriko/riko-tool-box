"use client";

import { useState } from "react";
import HistoryPageLayout from "@/components/HistoryPageLayout";
import StatusBadge from "@/components/StatusBadge";
import MonoText from "@/components/MonoText";
import { downloadBlob } from "@/lib/downloadPdf";
import {
  textToParagraphs,
  type QuizQuestion,
  type ReadingQuiz,
} from "@/lib/readingQuiz";
import type { Lang, Source } from "@/config/readingQuiz";

interface Session {
  id: string;
  source: Source;
  lang: Lang;
  title: string;
  origin: string;
  url: string | null;
  passage_text: string;
  questions_json: string;
  created_at: string;
  is_own: boolean;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

function parseQuestions(raw: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizQuestion[]) : [];
  } catch {
    return [];
  }
}

function toQuiz(s: Session): ReadingQuiz {
  return {
    source: s.source,
    lang: s.lang,
    title: s.title,
    origin: s.origin,
    url: s.url,
    paragraphs: textToParagraphs(s.passage_text),
    questions: parseQuestions(s.questions_json),
  };
}

export default function ReadingQuizHistoryPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleRedownload = async (s: Session) => {
    setDownloading(s.id);
    try {
      const res = await fetch("/api/reading-quiz/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzles: [toQuiz(s)] }),
      });
      if (!res.ok) throw new Error();
      downloadBlob(await res.blob(), "reading-quiz.pdf");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <HistoryPageLayout<Session>
      title="Reading Quiz History"
      subtitle="Every generated text is auto-saved with its questions."
      backHref="/tools/reading-quiz"
      backLabel="← Reading Quiz"
      fetchUrl="/api/reading-quiz/sessions"
      dataKey="sessions"
      countLabel={(n) => `${n} text${n !== 1 ? "s" : ""}`}
      renderCardMeta={(s) => (
        <>
          <StatusBadge variant="accent">{s.origin}</StatusBadge>
          <StatusBadge variant="border">{s.lang.toUpperCase()}</StatusBadge>
          <MonoText color="secondary" className="truncate">
            {s.title}
          </MonoText>
        </>
      )}
      renderExpanded={(s) => {
        const quiz = toQuiz(s);
        return (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => handleRedownload(s)}
              disabled={downloading === s.id}
              className="btn-ghost text-xs self-start"
              style={{ color: "var(--accent)" }}
            >
              {downloading === s.id ? "Preparing..." : "Re-download PDF"}
            </button>
            {s.url?.startsWith("https://") && (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {s.title}
              </a>
            )}
            {quiz.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed"
                style={{ color: "var(--secondary)" }}
              >
                {p}
              </p>
            ))}
            <div className="flex flex-col gap-3">
              {quiz.questions.map((q, qi) => (
                <div
                  key={qi}
                  className="flex flex-col gap-1 pt-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {qi + 1}. {q.question}
                  </p>
                  <MonoText color="muted">
                    Answer: {OPTION_LABELS[q.answerIndex]}.{" "}
                    {q.options[q.answerIndex]}
                  </MonoText>
                  {q.explanation && (
                    <MonoText color="secondary">{q.explanation}</MonoText>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}
