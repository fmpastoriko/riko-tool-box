"use client";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PASSAGE_VERSES,
  LANGS,
  MAX_PASSAGE_VERSES,
  MAX_TEXTS,
  MIN_PASSAGE_VERSES,
  MIN_TEXTS,
  PASSAGE_SCOPES,
  SOURCES,
  type Lang,
  type PassageScope,
  type Source,
} from "@/config/readingQuiz";
import {
  readingToText,
  type QuizQuestion,
  type Reading,
  type ReadingQuiz,
} from "@/lib/readingQuiz";
import { downloadPdf } from "@/lib/downloadPdf";
import { TOOLS_CONFIG } from "@/config/tools";
import ToolHeader from "@/components/ToolHeader";
import HistoryButton from "@/components/HistoryButton";
import PanelBox from "@/components/PanelBox";
import PuzzleNavigation from "@/components/PuzzleNavigation";
import Card from "@/components/Card";
import Slider from "@/components/Slider";
import TagButton from "@/components/TagButton";
import EmptyState from "@/components/EmptyState";
import ErrorText from "@/components/ErrorText";

const SOURCE_KEY = "reading-quiz-source";
const LANG_KEY = "reading-quiz-lang";
const SCOPE_KEY = "reading-quiz-scope";
const DUPLICATE_RETRIES = 3;
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

async function postJson<T>(url: string, body: unknown, fallback: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || fallback);
  return data as T;
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
  const [count, setCount] = useState(MIN_TEXTS);
  const [quizzes, setQuizzes] = useState<ReadingQuiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem(SOURCE_KEY, source);
    sessionStorage.setItem(LANG_KEY, lang);
    sessionStorage.setItem(SCOPE_KEY, scope);
  }, [source, lang, scope]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const updatePdfPreview = useCallback(async (list: ReadingQuiz[]) => {
    if (list.length === 0) return;
    try {
      const res = await fetch("/api/reading-quiz/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzles: list }),
      });
      if (!res.ok) return;
      const url = URL.createObjectURL(await res.blob());
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {}
  }, []);

  const fetchNewReading = useCallback(
    async (seen: Set<string>): Promise<Reading> => {
      let reading: Reading | null = null;
      for (let i = 0; i < DUPLICATE_RETRIES; i++) {
        reading = (
          await postJson<{ reading: Reading }>(
            "/api/reading-quiz/text",
            { source, lang, scope, verseCount },
            "Failed to fetch text",
          )
        ).reading;
        if (!seen.has(reading.title)) break;
      }
      return reading!;
    },
    [source, lang, scope, verseCount],
  );

  const handleGenerate = useCallback(async () => {
    setError("");
    setQuizzes([]);
    setCurrentIndex(0);
    const generated: ReadingQuiz[] = [];
    const seen = new Set<string>();
    try {
      for (let i = 0; i < count; i++) {
        const step = count > 1 ? `Text ${i + 1}/${count}: ` : "";
        setLoading(`${step}Pulling text...`);
        const reading = await fetchNewReading(seen);
        seen.add(reading.title);
        setLoading(`${step}Writing questions...`);
        const { questions } = await postJson<{ questions: QuizQuestion[] }>(
          "/api/reading-quiz/quiz",
          {
            title: reading.title,
            lang: reading.lang,
            passageText: readingToText(reading.paragraphs),
          },
          "Failed to generate questions",
        );
        const quiz = { ...reading, questions };
        generated.push(quiz);
        fetch("/api/reading-quiz/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: quiz.source,
            lang: quiz.lang,
            title: quiz.title,
            origin: quiz.origin,
            url: quiz.url,
            passage_text: readingToText(quiz.paragraphs),
            questions_json: JSON.stringify(quiz.questions),
          }),
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    }
    if (generated.length > 0) {
      setLoading("Rendering PDF...");
      setQuizzes(generated);
      await updatePdfPreview(generated);
    }
    setLoading("");
  }, [count, fetchNewReading, updatePdfPreview]);

  const handleDownload = useCallback(async () => {
    if (quizzes.length === 0) return;
    setDownloading(true);
    try {
      await downloadPdf(quizzes, "/api/reading-quiz/pdf", "reading-quiz.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [quizzes]);

  const busy = loading !== "";

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
                  disabled={busy}
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
                  disabled={busy}
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
                      disabled={busy}
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
          <Slider
            label="Number of Texts"
            value={count}
            min={MIN_TEXTS}
            max={MAX_TEXTS}
            onChange={setCount}
          />
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="btn-primary text-xs font-mono flex-shrink-0 justify-center"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {loading || "Generate"}
          </button>
          {error && <ErrorText>{error}</ErrorText>}
          {quizzes.length > 0 && pdfPreviewUrl && !busy && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-ghost text-xs font-mono flex-shrink-0 justify-center lg:hidden"
            >
              {downloading
                ? "Downloading..."
                : `Download PDF${quizzes.length > 1 ? ` (${quizzes.length})` : ""}`}
            </button>
          )}
        </div>

        <PanelBox
          title={`Preview${quizzes.length > 0 ? ` (${currentIndex + 1} / ${quizzes.length})` : ""}`}
          headerRight={
            <PuzzleNavigation
              title=""
              count={quizzes.length}
              currentIndex={currentIndex}
              onIndexChange={setCurrentIndex}
              onDownload={handleDownload}
              downloading={downloading}
            />
          }
          className="flex-1 min-h-0 overflow-auto hidden lg:flex"
        >
          {quizzes.length === 0 ? (
            <EmptyState
              message={loading || "Pick a source and click Generate."}
            />
          ) : pdfPreviewUrl ? (
            <div className="flex items-center justify-center p-2 w-full h-full">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-none"
                title="PDF Preview"
              />
            </div>
          ) : (
            <EmptyState message="Loading preview..." />
          )}
        </PanelBox>
      </div>
    </div>
  );
}
