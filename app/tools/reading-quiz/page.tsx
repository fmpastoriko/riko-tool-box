"use client";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PASSAGE_VERSES,
  LANGS,
  MAX_PASSAGE_VERSES,
  MIN_PASSAGE_VERSES,
  PASSAGE_SCOPES,
  SOURCES,
  type Lang,
  type PassageScope,
  type Source,
} from "@/config/readingQuiz";
import {
  readingToText,
  scoreAnswers,
  type QuizQuestion,
  type Reading,
} from "@/lib/readingQuiz";
import { TOOLS_CONFIG } from "@/config/tools";
import ToolHeader from "@/components/ToolHeader";
import HistoryButton from "@/components/HistoryButton";
import PanelBox from "@/components/PanelBox";
import Card from "@/components/Card";
import Slider from "@/components/Slider";
import TagButton from "@/components/TagButton";
import StatusBadge from "@/components/StatusBadge";
import MonoText from "@/components/MonoText";
import EmptyState from "@/components/EmptyState";
import ErrorText from "@/components/ErrorText";

const SOURCE_KEY = "reading-quiz-source";
const LANG_KEY = "reading-quiz-lang";
const SCOPE_KEY = "reading-quiz-scope";
const OPTION_LABELS = ["A", "B", "C", "D", "E"];
const toolConfig = TOOLS_CONFIG.find((t) => t.href === "/tools/reading-quiz")!;

function loadChoice<T extends string>(
  key: string,
  choices: { value: T }[],
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  const saved = sessionStorage.getItem(key);
  return choices.some((c) => c.value === saved) ? (saved as T) : fallback;
}

export default function ReadingQuizPage() {
  const [source, setSource] = useState<Source>(() =>
    loadChoice(SOURCE_KEY, SOURCES, "news"),
  );
  const [lang, setLang] = useState<Lang>(() =>
    loadChoice(LANG_KEY, LANGS, "id"),
  );
  const [scope, setScope] = useState<PassageScope>(() =>
    loadChoice(SCOPE_KEY, PASSAGE_SCOPES, "narrative"),
  );
  const [verseCount, setVerseCount] = useState(DEFAULT_PASSAGE_VERSES);
  const [reading, setReading] = useState<Reading | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    sessionStorage.setItem(SOURCE_KEY, source);
    sessionStorage.setItem(LANG_KEY, lang);
    sessionStorage.setItem(SCOPE_KEY, scope);
  }, [source, lang, scope]);

  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setAnswers([]);
    setSubmitted(false);
    setSessionId(null);
  }, []);

  const fetchReading = useCallback(async (): Promise<Reading> => {
    const res = await fetch("/api/reading-quiz/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, lang, scope, verseCount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to fetch text");
    return data.reading as Reading;
  }, [source, lang, scope, verseCount]);

  const fetchQuestions = useCallback(
    async (target: Reading): Promise<QuizQuestion[]> => {
      const res = await fetch("/api/reading-quiz/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title,
          source: target.source,
          lang: target.lang,
          passageText: readingToText(target.units),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Failed to generate questions");
      const list = (data.questions ?? []) as QuizQuestion[];
      if (list.length === 0) throw new Error("No questions returned");
      return list;
    },
    [],
  );

  const saveSession = useCallback(
    async (target: Reading, list: QuizQuestion[]) => {
      try {
        const res = await fetch("/api/reading-quiz/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: target.source,
            lang: target.lang,
            title: target.title,
            origin: target.origin,
            url: target.url,
            passage_text: readingToText(target.units),
            questions_json: JSON.stringify(list),
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setSessionId(data.id ?? null);
      } catch {}
    },
    [],
  );

  const runQuiz = useCallback(
    async (existing: Reading | null) => {
      setError("");
      resetQuiz();
      setLoading(existing ? "Writing questions..." : "Pulling text...");
      try {
        const target = existing ?? (await fetchReading());
        setReading(target);
        setLoading("Writing questions...");
        const list = await fetchQuestions(target);
        setQuestions(list);
        setAnswers(new Array(list.length).fill(null));
        await saveSession(target, list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed.");
      } finally {
        setLoading("");
      }
    },
    [fetchReading, fetchQuestions, resetQuiz, saveSession],
  );

  const handleSubmit = useCallback(async () => {
    if (questions.length === 0 || submitted) return;
    setSubmitted(true);
    const score = scoreAnswers(questions, answers);
    if (!sessionId) return;
    try {
      await fetch(`/api/reading-quiz/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers_json: JSON.stringify(answers), score }),
      });
    } catch {}
  }, [answers, questions, sessionId, submitted]);

  const answered = answers.filter((a) => a !== null).length;
  const score = submitted ? scoreAnswers(questions, answers) : 0;

  const optionStyle = (questionIndex: number, optionIndex: number) => {
    const picked = answers[questionIndex] === optionIndex;
    const correct = questions[questionIndex].answerIndex === optionIndex;
    if (!submitted) {
      return {
        background: picked ? "var(--accent-dim)" : "var(--bg)",
        borderColor: picked ? "var(--accent)" : "var(--border)",
        color: picked ? "var(--accent)" : "var(--secondary)",
      };
    }
    if (correct) {
      return {
        background: "rgba(34,197,94,0.1)",
        borderColor: "rgb(34,197,94)",
        color: "rgb(34,197,94)",
      };
    }
    if (picked) {
      return {
        background: "rgba(239,68,68,0.1)",
        borderColor: "rgb(239,68,68)",
        color: "rgb(239,68,68)",
      };
    }
    return {
      background: "var(--bg)",
      borderColor: "var(--border)",
      color: "var(--muted)",
    };
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex items-start justify-between flex-shrink-0">
        <ToolHeader
          title={toolConfig.label}
          subtitle={toolConfig.shortDescription}
          mediumUrl={toolConfig.mediumUrl}
        />
        <div className="flex gap-2">
          <HistoryButton href="/tools/reading-quiz/history" />
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3 lg:overflow-y-auto lg:min-h-0">
          <Card title="Source" className="flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {SOURCES.map((s) => (
                <TagButton
                  key={s.value}
                  active={source === s.value}
                  onClick={() => setSource(s.value)}
                  disabled={loading !== ""}
                >
                  {s.label}
                </TagButton>
              ))}
            </div>
          </Card>
          <Card title="Language" className="flex-shrink-0">
            <div className="flex flex-wrap gap-1.5">
              {LANGS.map((l) => (
                <TagButton
                  key={l.value}
                  active={lang === l.value}
                  onClick={() => setLang(l.value)}
                  disabled={loading !== ""}
                >
                  {l.label}
                </TagButton>
              ))}
            </div>
          </Card>
          {source === "bible" && (
            <>
              <Card title="Passage Scope" className="flex-shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {PASSAGE_SCOPES.map((s) => (
                    <TagButton
                      key={s.value}
                      active={scope === s.value}
                      onClick={() => setScope(s.value)}
                      disabled={loading !== ""}
                    >
                      {s.label}
                    </TagButton>
                  ))}
                </div>
              </Card>
              <Slider
                label="Passage Length"
                value={verseCount}
                min={MIN_PASSAGE_VERSES}
                max={MAX_PASSAGE_VERSES}
                unit=" verses"
                onChange={setVerseCount}
              />
            </>
          )}
          <button
            onClick={() => runQuiz(null)}
            disabled={loading !== ""}
            className="btn-primary text-xs font-mono flex-shrink-0 justify-center"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {loading || "Generate Quiz"}
          </button>
          {reading && (
            <button
              onClick={() => runQuiz(reading)}
              disabled={loading !== ""}
              className="btn-ghost text-xs font-mono flex-shrink-0 justify-center"
            >
              New Questions, Same Text
            </button>
          )}
          {error && <ErrorText>{error}</ErrorText>}
          {questions.length > 0 && (
            <Card title="Progress" className="flex-shrink-0">
              <MonoText color="muted">
                {submitted
                  ? `Score ${score} / ${questions.length}`
                  : `${answered} / ${questions.length} answered`}
              </MonoText>
              {!submitted && (
                <button
                  onClick={handleSubmit}
                  disabled={answered === 0}
                  className="btn-primary text-xs font-mono w-full justify-center mt-2"
                  style={{ opacity: answered === 0 ? 0.6 : 1 }}
                >
                  Check Answers
                </button>
              )}
            </Card>
          )}
        </div>

        <PanelBox
          title="Reading"
          headerRight={
            reading ? (
              <>
                <StatusBadge variant="accent">{reading.origin}</StatusBadge>
                <StatusBadge variant="border">
                  {reading.lang.toUpperCase()}
                </StatusBadge>
              </>
            ) : null
          }
          className="flex-1 min-h-0 overflow-auto"
        >
          {loading && !reading ? (
            <EmptyState message={loading} />
          ) : !reading ? (
            <EmptyState message="Pick a source and click Generate Quiz." />
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto min-h-0 pr-1">
              <div className="flex flex-col gap-1">
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: "var(--primary)" }}
                >
                  {reading.url ? (
                    <a href={reading.url} target="_blank" rel="noreferrer">
                      {reading.title}
                    </a>
                  ) : (
                    reading.title
                  )}
                </p>
                {reading.units.map((u) => (
                  <p
                    key={u.label}
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--secondary)" }}
                  >
                    <span
                      className="font-mono text-xs mr-1.5"
                      style={{ color: "var(--muted)" }}
                    >
                      {u.label}
                    </span>
                    {u.text}
                  </p>
                ))}
              </div>

              {loading && questions.length === 0 && (
                <MonoText color="muted">{loading}</MonoText>
              )}

              {questions.map((q, qi) => (
                <div
                  key={qi}
                  className="flex flex-col gap-2 pt-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {qi + 1}. {q.question}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() =>
                          !submitted &&
                          setAnswers((prev) => {
                            const next = [...prev];
                            next[qi] = oi;
                            return next;
                          })
                        }
                        disabled={submitted}
                        className="text-left text-sm rounded-lg px-3 py-2 transition-colors"
                        style={{
                          border: "1px solid",
                          cursor: submitted ? "default" : "pointer",
                          ...optionStyle(qi, oi),
                        }}
                      >
                        <span className="font-mono text-xs mr-2">
                          {OPTION_LABELS[oi] ?? oi + 1}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {submitted && q.explanation && (
                    <MonoText color="muted">{q.explanation}</MonoText>
                  )}
                </div>
              ))}
            </div>
          )}
        </PanelBox>
      </div>
    </div>
  );
}
