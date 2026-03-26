"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  generatePuzzles,
  type Puzzle,
  type PuzzleOptions,
  type Operator,
  type HideTarget,
} from "@/lib/arithmeticPuzzle";
import ToolHeader from "@/components/ToolHeader";
import PanelBox from "@/components/PanelBox";
import { TOOLS_CONFIG } from "@/config/tools";
import Slider from "@/components/Slider";
import PuzzleNavigation from "@/components/PuzzleNavigation";
import { downloadPdf } from "@/lib/downloadPdf";
import HistoryButton from "@/components/HistoryButton";
import LatestButton from "@/components/LatestButton";
import Card from "@/components/Card";
import TagButton from "@/components/TagButton";
import EmptyState from "@/components/EmptyState";
import ErrorText from "@/components/ErrorText";
const toolConfig = TOOLS_CONFIG.find(
  (t) => t.href === "/tools/arithmetic-puzzle",
)!;
const ALL_OPERATORS: Operator[] = ["+", "-", "*", "/"];
const OPERATOR_LABELS: Record<Operator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};
const ALL_HIDE_TARGETS: HideTarget[] = ["operator", "number"];
const HIDE_TARGET_LABELS: Record<HideTarget, string> = {
  operator: "Operator",
  number: "Number",
};
interface FormState {
  operators: Operator[];
  minNum: number;
  maxNum: number;
  allowNegative: boolean;
  questionCount: number;
  hidePercentage: number;
  count: number;
  hideTargets: HideTarget[];
}
interface Session {
  id: string;
  options_json: string;
  puzzles_json: string;
  created_at: string;
  is_own: boolean;
}
export default function ArithmeticPuzzlePage() {
  const [form, setForm] = useState<FormState>({
    operators: ["+", "-", "*"],
    minNum: 1,
    maxNum: 20,
    allowNegative: false,
    questionCount: 30,
    hidePercentage: 35,
    count: 1,
    hideTargets: ["operator", "number"],
  });
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const pdfPreviewRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);
  const updatePdfPreview = useCallback(async (puz: Puzzle[]) => {
    if (puz.length === 0) return;
    try {
      const res = await fetch("/api/arithmetic-puzzle/pdf", {
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
  const toggleOperator = (op: Operator) => {
    setForm((f) => {
      const has = f.operators.includes(op);
      if (has && f.operators.length === 1) return f;
      return {
        ...f,
        operators: has
          ? f.operators.filter((o) => o !== op)
          : [...f.operators, op],
      };
    });
  };
  const toggleHideTarget = (target: HideTarget) => {
    setForm((f) => {
      const has = f.hideTargets.includes(target);
      if (has && f.hideTargets.length === 1) return f;
      return {
        ...f,
        hideTargets: has
          ? f.hideTargets.filter((t) => t !== target)
          : [...f.hideTargets, target],
      };
    });
  };
  const handleGenerate = useCallback(async () => {
    setError("");
    setGenerating(true);
    try {
      const opts: PuzzleOptions = {
        operators: form.operators,
        numberRange: [form.minNum, form.maxNum],
        allowNegative: form.allowNegative,
        targetEquations: form.questionCount,
        hidePercentage: form.hidePercentage,
        hideTargets: form.hideTargets,
      };
      const generated = generatePuzzles(form.count, opts);
      setPuzzles(generated);
      setCurrentIndex(0);
      await updatePdfPreview(generated);
      await fetch("/api/arithmetic-puzzle/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options_json: JSON.stringify(form),
          puzzles_json: JSON.stringify(generated),
        }),
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Generation failed. Try again.",
      );
    } finally {
      setGenerating(false);
    }
  }, [form, updatePdfPreview]);
  const handleLoadLatest = useCallback(
    (session: unknown) => {
      const s = session as Session;
      try {
        const loadedPuzzles = JSON.parse(s.puzzles_json);
        const loadedOptions = JSON.parse(s.options_json);
        setPuzzles(loadedPuzzles);
        setCurrentIndex(0);
        setForm(loadedOptions);
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
      await downloadPdf(
        puzzles,
        "/api/arithmetic-puzzle/pdf",
        "arithmetic-puzzle.pdf",
      );
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
          subtitle={toolConfig.shortDescription}
          mediumUrl={toolConfig.mediumUrl}
        />
        <div className="flex gap-2">
          <LatestButton
            fetchUrl="/api/arithmetic-puzzle/sessions"
            onLoadLatest={handleLoadLatest}
          />
          <HistoryButton href="/tools/arithmetic-puzzle/history" />
        </div>
      </div>
      <div className="flex gap-4 flex-1 min-h-0 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-3">
          <Card title="Operators" className="flex-shrink-0">
            <div className="flex gap-2 flex-wrap mt-1">
              {ALL_OPERATORS.map((op) => (
                <TagButton
                  key={op}
                  active={form.operators.includes(op)}
                  onClick={() => toggleOperator(op)}
                  style={{ fontSize: 14 }}
                >
                  {OPERATOR_LABELS[op]}
                </TagButton>
              ))}
            </div>
          </Card>
          <Card title="Number Range" className="flex-shrink-0">
            <div className="flex gap-2 items-center mt-1">
              <input
                type="number"
                value={form.minNum}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minNum: Number(e.target.value) }))
                }
                className="input-base w-20"
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--muted)" }}
              >
                to
              </span>
              <input
                type="number"
                value={form.maxNum}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxNum: Number(e.target.value) }))
                }
                className="input-base w-20"
              />
            </div>
          </Card>
          <Slider
            label="Question Count"
            value={form.questionCount}
            min={10}
            max={60}
            onChange={(v) => setForm((f) => ({ ...f, questionCount: v }))}
          />
          <Slider
            label="Hidden Cells"
            value={form.hidePercentage}
            min={10}
            max={70}
            step={5}
            unit="%"
            onChange={(v) => setForm((f) => ({ ...f, hidePercentage: v }))}
          />
          <Card title="Hide" className="flex-shrink-0">
            <div className="flex gap-2 flex-wrap mt-1">
              {ALL_HIDE_TARGETS.map((target) => (
                <TagButton
                  key={target}
                  active={form.hideTargets.includes(target)}
                  onClick={() => toggleHideTarget(target)}
                >
                  {HIDE_TARGET_LABELS[target]}
                </TagButton>
              ))}
            </div>
          </Card>
          <Slider
            label="Number of Puzzles"
            value={form.count}
            min={1}
            max={100}
            onChange={(v) => setForm((f) => ({ ...f, count: v }))}
          />
          <Card className="flex-shrink-0">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowNegative}
                onChange={(e) =>
                  setForm((f) => ({ ...f, allowNegative: e.target.checked }))
                }
              />
              <span
                className="text-xs font-mono"
                style={{ color: "var(--secondary)" }}
              >
                Allow negative numbers
              </span>
            </label>
          </Card>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary text-xs font-mono flex-shrink-0 justify-center"
            style={{ opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generating..." : "Generate"}
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
            <EmptyState>
              <ErrorText>{error}</ErrorText>
            </EmptyState>
          ) : !current ? (
            <EmptyState message="Configure options and click Generate." />
          ) : pdfPreviewUrl ? (
            <div className="flex items-center justify-center h-full p-2">
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
