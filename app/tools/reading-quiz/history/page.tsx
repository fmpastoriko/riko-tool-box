"use client";

import HistoryPageLayout from "@/components/HistoryPageLayout";
import StatusBadge from "@/components/StatusBadge";
import MonoText from "@/components/MonoText";
import type { QuizQuestion } from "@/lib/readingQuiz";

interface Session {
  id: string;
  source: string;
  lang: string;
  title: string;
  origin: string;
  url: string | null;
  passage_text: string;
  questions_json: string;
  answers_json: string | null;
  score: number | null;
  created_at: string;
  is_own: boolean;
}

function parseQuestions(raw: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizQuestion[]) : [];
  } catch {
    return [];
  }
}

function parseAnswers(raw: string | null): (number | null)[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as (number | null)[]) : [];
  } catch {
    return [];
  }
}

export default function ReadingQuizHistoryPage() {
  return (
    <HistoryPageLayout<Session>
      title="Reading Quiz History"
      subtitle="Every generated quiz is auto-saved, scores included."
      backHref="/tools/reading-quiz"
      backLabel="← Reading Quiz"
      fetchUrl="/api/reading-quiz/sessions"
      dataKey="sessions"
      countLabel={(n) => `${n} quiz${n !== 1 ? "zes" : ""}`}
      renderCardMeta={(s) => {
        const total = parseQuestions(s.questions_json).length;
        return (
          <>
            <StatusBadge variant="accent">{s.origin}</StatusBadge>
            <StatusBadge variant="border">{s.lang.toUpperCase()}</StatusBadge>
            <MonoText color="secondary" className="truncate">
              {s.title}
            </MonoText>
            <MonoText color="muted" className="ml-auto">
              {s.score === null
                ? `${total} questions · not submitted`
                : `Score ${s.score} / ${total}`}
            </MonoText>
          </>
        );
      }}
      renderExpanded={(s) => {
        const questions = parseQuestions(s.questions_json);
        const answers = parseAnswers(s.answers_json);
        return (
          <div className="flex flex-col gap-4">
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
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--secondary)" }}
            >
              {s.passage_text}
            </p>
            <div className="flex flex-col gap-3">
              {questions.map((q, qi) => {
                const picked = answers[qi];
                const correct = picked === q.answerIndex;
                return (
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
                      Answer: {q.options[q.answerIndex]}
                    </MonoText>
                    {picked !== null && picked !== undefined && (
                      <MonoText
                        color="muted"
                        style={{
                          color: correct ? "rgb(34,197,94)" : "rgb(239,68,68)",
                        }}
                      >
                        Picked: {q.options[picked] ?? "-"}
                      </MonoText>
                    )}
                    {q.explanation && (
                      <MonoText color="secondary">{q.explanation}</MonoText>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    />
  );
}
