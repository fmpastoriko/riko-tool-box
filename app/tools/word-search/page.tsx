"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { generateWordSearches, type WordSearchPuzzle } from "@/lib/wordSearch";
import ToolHeader from "@/components/ToolHeader";
import PanelBox from "@/components/PanelBox";
import { TOOLS_CONFIG } from "@/config/tools";
import Slider from "@/components/Slider";
import PuzzleNavigation from "@/components/PuzzleNavigation";
import { downloadPdf } from "@/lib/downloadPdf";
import HistoryButton from "@/components/HistoryButton";
import LatestButton from "@/components/LatestButton";
import Card from "@/components/Card";
import EmptyState from "@/components/EmptyState";
import ErrorText from "@/components/ErrorText";
const TOPIC_KEY = "word-search-topic";
const toolConfig = TOOLS_CONFIG.find((t) => t.href === "/tools/word-search")!;
const GENERATE_TIMEOUT_MS = 5000;
const MAX_RETRIES = 5;
interface Session {
  id: string;
  topic: string;
  options_json: string;
  puzzles_json: string;
  created_at: string;
  is_own: boolean;
}
export default function WordSearchPage() {
  const [topic, setTopic] = useState(() => {
    if (typeof window !== "undefined")
      return sessionStorage.getItem(TOPIC_KEY) || "Random aja";
    return "Random aja";
  });
  const [wordCount, setWordCount] = useState(10);
  const [gridSize, setGridSize] = useState(15);
  const [count, setCount] = useState(1);
  const [puzzles, setPuzzles] = useState<WordSearchPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingWords, setLoadingWords] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfPreviewRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    sessionStorage.setItem(TOPIC_KEY, topic);
  }, [topic]);
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);
  const updatePdfPreview = useCallback(async (puz: WordSearchPuzzle[]) => {
    if (puz.length === 0) return;
    try {
      const res = await fetch("/api/word-search/pdf", {
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
      setError("Please enter a topic.");
      return;
    }
    setError("");
    setLoadingWords(true);
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
        const res = await fetch("/api/word-search/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim(), count: wordCount }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Word generation failed");
        const data = await res.json();
        const words: string[] = data.words;
        if (!words || words.length === 0) throw new Error("No words returned");
        const generated: WordSearchPuzzle[] = [];
        for (let i = 0; i < count; i++) {
          const result = generateWordSearches(1, { words, gridSize });
          if (result.length > 0)
            generated.push({ ...result[0], topic: topic.trim() });
        }
        if (generated.length === 0)
          throw new Error(
            "Could not place all words. Try a larger grid or fewer words.",
          );
        setPuzzles(generated);
        setCurrentIndex(0);
        await updatePdfPreview(generated);
        await fetch("/api/word-search/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            options_json: JSON.stringify({
              wordCount,
              gridSize,
              puzzleCount: count,
            }),
            puzzles_json: JSON.stringify(generated),
          }),
        });
        setLoadingWords(false);
        abortRef.current = null;
        return;
      } catch (e: unknown) {
        clearTimeout(timeoutId);
        if (e instanceof Error && e.name === "AbortError") {
          attempts++;
          setRetryCount(attempts);
          if (attempts >= MAX_RETRIES) {
            lastError =
              "Generation timed out after 5 retries. Please try again.";
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
    setLoadingWords(false);
    abortRef.current = null;
  }, [topic, wordCount, gridSize, count, updatePdfPreview]);
  const handleLoadLatest = useCallback(
    (session: unknown) => {
      const s = session as Session;
      try {
        const loadedPuzzles = JSON.parse(s.puzzles_json);
        const loadedOptions = JSON.parse(s.options_json);
        setPuzzles(loadedPuzzles);
        setCurrentIndex(0);
        setTopic(s.topic);
        setWordCount(loadedOptions.wordCount || 10);
        setGridSize(loadedOptions.gridSize || 15);
        setCount(loadedOptions.puzzleCount || 1);
        updatePdfPreview(loadedPuzzles);
      } catch {
        setError("Failed to load latest session.");
      }
    },
    [updatePdfPreview],
  );
  const handleDownload = useCallback(async () => {
    if (puzzles.length === 0) return;
    setDownloading(true);
    try {
      await downloadPdf(puzzles, "/api/word-search/pdf", "word-search.pdf");
      await updatePdfPreview(puzzles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }, [puzzles, updatePdfPreview]);
  const current = puzzles[currentIndex];
  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex items-start justify-between flex-shrink-0">
        <ToolHeader
          title={toolConfig.label}
          subtitle={toolConfig.description}
          mediumUrl={toolConfig.mediumUrl}
        />
        <div className="flex gap-2">
          <LatestButton
            fetchUrl="/api/word-search/sessions"
            onLoadLatest={handleLoadLatest}
          />
          <HistoryButton href="/tools/word-search/history" />
        </div>
      </div>
      <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3">
          <Card title="Topic (Bahasa Indonesia)" className="flex-shrink-0">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. hewan, buah-buahan, olahraga"
              className="input-base"
            />
          </Card>
          <Slider
            label="Number of Words"
            value={wordCount}
            min={3}
            max={25}
            unit=" words"
            onChange={setWordCount}
          />
          <Slider
            label="Grid Size"
            value={gridSize}
            min={10}
            max={30}
            unit={` × ${gridSize}`}
            onChange={setGridSize}
          />
          <Slider
            label="Number of Puzzles"
            value={count}
            min={1}
            max={100}
            onChange={setCount}
          />
          <button
            onClick={handleGenerate}
            disabled={loadingWords || !topic.trim()}
            className="btn-primary text-xs font-mono flex-shrink-0 justify-center"
            style={{ opacity: !topic.trim() ? 0.6 : 1 }}
          >
            {loadingWords
              ? retryCount > 0
                ? `Retry ${retryCount}/${MAX_RETRIES}...`
                : "Generating words..."
              : "Generate"}
          </button>
          {error && <ErrorText>{error}</ErrorText>}
          <button
            onClick={handleDownload}
            disabled={puzzles.length === 0 || downloading}
            className="btn-ghost text-xs font-mono flex-shrink-0 justify-center lg:hidden"
            style={{ opacity: puzzles.length === 0 ? 0.5 : 1 }}
          >
            {downloading
              ? "Downloading..."
              : `Download PDF${puzzles.length > 1 ? ` (${puzzles.length})` : ""}`}
          </button>
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
            <EmptyState message="Enter a topic and click Generate." />
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
