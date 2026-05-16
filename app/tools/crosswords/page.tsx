"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  generateCrossword,
  type CrosswordPuzzle,
  type Difficulty,
} from "@/lib/crosswordPuzzle";
import ToolHeader from "@/components/ToolHeader";
import PanelBox from "@/components/PanelBox";
import { TOOLS_CONFIG } from "@/config/tools";
import Slider from "@/components/Slider";
import PuzzleNavigation from "@/components/PuzzleNavigation";
import { downloadPdf } from "@/lib/downloadPdf";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import ErrorText from "@/components/ErrorText";
import TagButton from "@/components/TagButton";

const TOPIC_KEY = "crosswords-topic";
const toolConfig = TOOLS_CONFIG.find((t) => t.href === "/tools/crosswords")!;
const GENERATE_TIMEOUT_MS = 8000;
const MAX_RETRIES = 3;

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Mudah" },
  { value: "medium", label: "Sedang" },
  { value: "hard", label: "Sulit" },
];

export default function CrosswordsPage() {
  const [topic, setTopic] = useState(() => {
    if (typeof window !== "undefined")
      return sessionStorage.getItem(TOPIC_KEY) || "Hewan";
    return "Hewan";
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [wordCount, setWordCount] = useState(10);
  const [puzzleCount, setPuzzleCount] = useState(1);
  const [prefillCount, setPrefillCount] = useState(1);
  const prefillMax = Math.floor(wordCount * 0.2);
  useEffect(() => {
    if (prefillCount > prefillMax) setPrefillCount(prefillMax);
  }, [prefillMax, prefillCount]);
  const [puzzles, setPuzzles] = useState<CrosswordPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [reviewInput, setReviewInput] = useState("");
  const [reviewCrosswordId, setReviewCrosswordId] = useState("");
  const [marking, setMarking] = useState(false);
  const [markStatus, setMarkStatus] = useState("");
  const [lastCrosswordId, setLastCrosswordId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pdfPreviewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    sessionStorage.setItem(TOPIC_KEY, topic);
  }, [topic]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const updatePdfPreview = useCallback(async (puz: CrosswordPuzzle[]) => {
    if (puz.length === 0) return;
    try {
      const res = await fetch("/api/crosswords/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzles: puz }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {}
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setError("Topik tidak boleh kosong.");
      return;
    }
    setError("");
    setLoading(true);
    setRetryCount(0);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let attempts = 0;
    let lastError = "";
    while (attempts < MAX_RETRIES) {
      if (controller.signal.aborted) break;
      const timeoutId = setTimeout(
        () => controller.abort(),
        GENERATE_TIMEOUT_MS * (attempts + 1),
      );
      try {
        const res = await fetch("/api/crosswords/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            count: wordCount,
            difficulty,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Gagal generate");
        }
        const data = await res.json();
        const clues = data.clues as { word: string; clue: string }[];
        const crosswordId = data.crosswordId as number | undefined;
        if (!clues || clues.length < 3) throw new Error("Kata terlalu sedikit");
        if (crosswordId) {
          setLastCrosswordId(crosswordId);
          setReviewCrosswordId(String(crosswordId));
        }

        const generated: CrosswordPuzzle[] = [];
        for (let i = 0; i < puzzleCount; i++) {
          const p = generateCrossword({
            clues,
            topic: topic.trim(),
            difficulty,
            targetCount: wordCount,
          });
          if (p && p.placements.length >= 2) {
            const placedWords = p.placements.map((pl) => pl.word);
            const shuffled = [...placedWords].sort(() => Math.random() - 0.5);
            const prefilledWords = shuffled.slice(
              0,
              Math.min(prefillCount, placedWords.length),
            );
            generated.push({
              ...p,
              topic: topic.trim(),
              difficulty,
              prefilledWords,
            });
          }
        }
        if (generated.length === 0)
          throw new Error("Gagal menyusun grid. Coba kata lain.");

        setPuzzles(generated);
        setCurrentIndex(0);
        await updatePdfPreview(generated);
        setLoading(false);
        abortRef.current = null;
        return;
      } catch (e: unknown) {
        clearTimeout(timeoutId);
        if (e instanceof Error && e.name === "AbortError") {
          attempts++;
          setRetryCount(attempts);
          if (attempts >= MAX_RETRIES) {
            lastError = "Timeout setelah beberapa kali percobaan.";
            break;
          }
          const newController = new AbortController();
          abortRef.current = newController;
          continue;
        }
        lastError = e instanceof Error ? e.message : "Generation failed.";
        break;
      }
    }
    setError(lastError || "Generation failed.");
    setLoading(false);
    abortRef.current = null;
  }, [topic, wordCount, puzzleCount, difficulty, updatePdfPreview]);

  const handleDownload = useCallback(async () => {
    if (puzzles.length === 0) return;
    setDownloading(true);
    try {
      await downloadPdf(
        puzzles,
        "/api/crosswords/pdf",
        "crosswords.pdf",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [puzzles]);

  const current = puzzles[currentIndex];

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex items-start justify-between flex-shrink-0">
        <ToolHeader
          title={toolConfig.label}
          subtitle={toolConfig.shortDescription}
          mediumUrl={toolConfig.mediumUrl}
        />
        {lastCrosswordId !== null && (
          <span
            className="text-xs font-mono px-2 py-1 rounded border"
            style={{
              color: "var(--accent)",
              borderColor: "var(--accent)",
            }}
          >
            Crossword #{lastCrosswordId}
          </span>
        )}
      </div>
      <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3 lg:overflow-y-auto lg:min-h-0">
          <Card title="Topik (Bahasa Indonesia)" className="flex-shrink-0">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="mis. hewan, buah, olahraga, sejarah"
              className="input-base"
            />
          </Card>
          <Card title="Tingkat Kesulitan" className="flex-shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {DIFFICULTIES.map((d) => (
                <TagButton
                  key={d.value}
                  active={difficulty === d.value}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </TagButton>
              ))}
            </div>
          </Card>
          <Slider
            label="Jumlah Kata"
            value={wordCount}
            min={3}
            max={20}
            unit=" kata"
            onChange={setWordCount}
          />
          <Slider
            label="Jumlah Puzzle"
            value={puzzleCount}
            min={1}
            max={20}
            onChange={setPuzzleCount}
          />
          <Slider
            label="Kata Prefilled"
            value={Math.min(prefillCount, prefillMax)}
            min={0}
            max={Math.max(0, prefillMax)}
            unit={prefillMax > 0 ? ` / ${prefillMax}` : ""}
            onChange={setPrefillCount}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="btn-primary text-xs font-mono flex-shrink-0 justify-center"
            style={{ opacity: !topic.trim() ? 0.6 : 1 }}
          >
            {loading
              ? retryCount > 0
                ? `Retry ${retryCount}/${MAX_RETRIES}...`
                : "Generating..."
              : "Generate"}
          </button>
          {error && <ErrorText>{error}</ErrorText>}
          {puzzles.length > 0 && pdfPreviewUrl && !loading && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-ghost text-xs font-mono flex-shrink-0 justify-center lg:hidden"
            >
              {downloading
                ? "Downloading..."
                : `Download PDF${puzzles.length > 1 ? ` (${puzzles.length})` : ""}`}
            </button>
          )}
          <Card title="Kata untuk Review" className="flex-shrink-0">
            <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>
              Kata yang ingin di-review (dijawab via Google atau tidak
              terjawab). Isi ID crossword + kata dipisah koma. Muncul lagi di
              generate pertama setelah 7 hari.
            </p>
            <input
              type="number"
              min={1}
              className="input-base text-xs w-full mb-2"
              placeholder="Crossword ID (mis. 12)"
              value={reviewCrosswordId}
              onChange={(e) => setReviewCrosswordId(e.target.value)}
            />
            <textarea
              className="input-base text-xs w-full resize-none"
              style={{ minHeight: 64 }}
              placeholder="contoh: KUCING, ANJING, BURUNG"
              value={reviewInput}
              onChange={(e) => setReviewInput(e.target.value)}
            />
            <button
              onClick={async () => {
                const cid = parseInt(reviewCrosswordId, 10);
                if (!Number.isInteger(cid) || cid < 1) {
                  setMarkStatus("Crossword ID tidak valid.");
                  return;
                }
                const words = reviewInput
                  .split(",")
                  .map((w) => w.trim().toUpperCase().replace(/[^A-Z]/g, ""))
                  .filter((w) => w.length >= 3 && w.length <= 20);
                const uniq = Array.from(new Set(words));
                if (uniq.length === 0) {
                  setMarkStatus("Tidak ada kata valid.");
                  return;
                }
                setMarking(true);
                setMarkStatus("");
                try {
                  const res = await fetch("/api/crosswords/review", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      items: uniq.map((w) => ({ word: w })),
                      crosswordId: cid,
                    }),
                  });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j.error || "Gagal");
                  }
                  setMarkStatus(`Tersimpan (${uniq.length}).`);
                  setReviewInput("");
                } catch (e) {
                  setMarkStatus(
                    e instanceof Error ? e.message : "Gagal menyimpan.",
                  );
                } finally {
                  setMarking(false);
                }
              }}
              disabled={marking || !reviewInput.trim()}
              className="btn-primary text-xs font-mono mt-2 w-full justify-center"
              style={{ opacity: !reviewInput.trim() ? 0.6 : 1 }}
            >
              {marking ? "Menyimpan..." : "Simpan untuk review"}
            </button>
            {markStatus && (
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {markStatus}
              </p>
            )}
          </Card>
        </div>
        <PanelBox
          title={`Preview${puzzles.length > 0 ? ` (${currentIndex + 1} / ${puzzles.length})` : ""}`}
          headerRight={
            <PuzzleNavigation
              title=""
              count={puzzles.length}
              currentIndex={currentIndex}
              onIndexChange={setCurrentIndex}
              onDownload={handleDownload}
              downloading={downloading}
            />
          }
          className="flex-1 min-h-0 overflow-auto hidden lg:flex"
        >
          {error ? (
            <div className="flex items-center justify-center h-full">
              <ErrorText>{error}</ErrorText>
            </div>
          ) : !current ? (
            <EmptyState message="Masukkan topik dan klik Generate." />
          ) : pdfPreviewUrl ? (
            <div className="flex items-center justify-center p-2 w-full h-full">
              <iframe
                ref={pdfPreviewRef}
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
