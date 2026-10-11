import { NextRequest, NextResponse } from "next/server";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { MAX_TEXTS, type Lang } from "@/config/readingQuiz";
import type { ReadingQuiz } from "@/lib/readingQuiz";
import { sendPdfResponse } from "@/lib/pdfUtils";
import { A4_W, A4_H, MARGIN, wrapText } from "@/lib/pdfLayout";

const OPTION_LABELS = ["A", "B", "C", "D", "E"];
const MUTED = rgb(0.4, 0.4, 0.4);
const INK = rgb(0.1, 0.1, 0.1);
const ANSWER = rgb(0, 0.3, 0.8);

const LABELS: Record<
  Lang,
  { text: string; intro: (from: number, to: number) => string; adapted: string }
> = {
  id: {
    text: "Teks",
    intro: (from, to) => `Bacalah teks berikut untuk nomor ${from} sampai ${to}.`,
    adapted: "diadaptasi dari",
  },
  en: {
    text: "Text",
    intro: (from, to) => `Read the following text for questions ${from} to ${to}.`,
    adapted: "adapted from",
  },
};

interface Fonts {
  bold: PDFFont;
  regular: PDFFont;
  italic: PDFFont;
}

function toWinAnsi(charset: Set<number>, text: string): string {
  return Array.from(
    text.replace(/[‐-―−]/g, "-").replace(/\s+/g, " "),
    (ch) => {
      if (charset.has(ch.codePointAt(0)!)) return ch;
      const base = ch.normalize("NFKD").replace(/\p{M}/gu, "");
      return base && Array.from(base).every((c) => charset.has(c.codePointAt(0)!))
        ? base
        : "?";
    },
  ).join("");
}

function createWriter(pdfDoc: PDFDocument, charset: Set<number>) {
  let page: PDFPage = pdfDoc.addPage([A4_W, A4_H]);
  let y = A4_H - MARGIN;
  const maxW = A4_W - MARGIN * 2;

  function newPage() {
    page = pdfDoc.addPage([A4_W, A4_H]);
    y = A4_H - MARGIN;
  }

  function item(
    label: string,
    text: string,
    font: PDFFont,
    size: number,
    opts: { indent?: number; labelFont?: PDFFont; color?: RGB } = {},
  ) {
    const indent = opts.indent ?? 0;
    const labelFont = opts.labelFont ?? font;
    const color = opts.color ?? INK;
    const safeLabel = toWinAnsi(charset, label);
    const labelW = safeLabel
      ? labelFont.widthOfTextAtSize(`${safeLabel} `, size)
      : 0;
    const lineH = size * 1.45;
    const lines = wrapText(
      font,
      toWinAnsi(charset, text),
      size,
      maxW - indent - labelW,
    );
    if (lines.length === 0) lines.push("");
    lines.forEach((line, i) => {
      if (y - lineH < MARGIN) newPage();
      if (i === 0 && safeLabel) {
        page.drawText(safeLabel, {
          x: MARGIN + indent,
          y: y - size,
          size,
          font: labelFont,
          color,
        });
      }
      page.drawText(line, {
        x: MARGIN + indent + labelW,
        y: y - size,
        size,
        font,
        color,
      });
      y -= lineH;
    });
  }

  return {
    newPage,
    gap: (h: number) => {
      y -= h;
    },
    text: (text: string, font: PDFFont, size: number, color?: RGB) =>
      item("", text, font, size, { color }),
    item,
  };
}

type Writer = ReturnType<typeof createWriter>;

function drawQuiz(
  w: Writer,
  fonts: Fonts,
  quiz: ReadingQuiz,
  index: number,
  total: number,
  firstNumber: number,
) {
  const labels = LABELS[quiz.lang] ?? LABELS.id;
  const lastNumber = firstNumber + quiz.questions.length - 1;

  w.text(quiz.title, fonts.bold, 12);
  w.text(
    `${labels.text} ${index + 1} / ${total}  •  ${labels.intro(firstNumber, lastNumber)}`,
    fonts.regular,
    9,
    MUTED,
  );
  w.gap(10);

  for (const paragraph of quiz.paragraphs) {
    w.text(paragraph, fonts.regular, 10.5);
    w.gap(6);
  }
  w.text(
    quiz.source === "news"
      ? `(${labels.adapted} ${quiz.origin})`
      : `(${quiz.origin})`,
    fonts.italic,
    9,
    MUTED,
  );
  w.gap(14);

  quiz.questions.forEach((q, qi) => {
    w.item(`${firstNumber + qi}.`, q.question, fonts.regular, 10.5);
    w.gap(3);
    q.options.forEach((opt, oi) => {
      w.item(`${OPTION_LABELS[oi] ?? oi + 1}.`, opt, fonts.regular, 10, {
        indent: 14,
      });
    });
    w.gap(10);
  });
}

function drawAnswerKey(w: Writer, fonts: Fonts, quizzes: ReadingQuiz[]) {
  w.newPage();
  w.text("Answer Key", fonts.bold, 10);
  w.gap(8);

  let number = 1;
  quizzes.forEach((quiz, i) => {
    const labels = LABELS[quiz.lang] ?? LABELS.id;
    w.text(`${labels.text} ${i + 1}: ${quiz.title}`, fonts.bold, 9.5);
    w.gap(2);
    for (const q of quiz.questions) {
      w.item(
        `${number}. ${OPTION_LABELS[q.answerIndex] ?? "?"}`,
        q.explanation,
        fonts.regular,
        9,
        { labelFont: fonts.bold, color: ANSWER },
      );
      number++;
    }
    w.gap(10);
  });
}

function isQuiz(value: unknown): value is ReadingQuiz {
  const q = value as ReadingQuiz;
  return (
    !!q &&
    typeof q.title === "string" &&
    typeof q.origin === "string" &&
    Array.isArray(q.paragraphs) &&
    q.paragraphs.every((p) => typeof p === "string") &&
    Array.isArray(q.questions) &&
    q.questions.every(
      (x) =>
        typeof x?.question === "string" &&
        Array.isArray(x.options) &&
        x.options.every((o) => typeof o === "string") &&
        typeof x.explanation === "string",
    )
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { puzzles } = body as { puzzles: unknown[] };

  if (
    !Array.isArray(puzzles) ||
    puzzles.length === 0 ||
    puzzles.length > MAX_TEXTS ||
    !puzzles.every(isQuiz)
  ) {
    return NextResponse.json({ error: "Invalid quizzes" }, { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();
  const fonts: Fonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  };
  const charset = new Set(fonts.regular.getCharacterSet());
  const writer = createWriter(pdfDoc, charset);

  let firstNumber = 1;
  puzzles.forEach((quiz, i) => {
    if (i > 0) writer.newPage();
    drawQuiz(writer, fonts, quiz, i, puzzles.length, firstNumber);
    firstNumber += quiz.questions.length;
  });
  drawAnswerKey(writer, fonts, puzzles);

  return sendPdfResponse(pdfDoc, "reading-quiz.pdf");
}
