import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { WordSearchPuzzle } from "@/lib/wordSearch";
import { sendPdfResponse } from "@/lib/pdfUtils";
import { A4_W, A4_H, MARGIN, ANSWER_KEY_PER_ROW, ANSWER_KEY_PER_COL, getAnswerKeyLayout } from "@/lib/pdfLayout";

const CELL = 24;

function drawWordSearchPage(pdfDoc: PDFDocument, puzzle: WordSearchPuzzle) {
  const page = pdfDoc.addPage([A4_W, A4_H]);
  const { grid, words, gridSize, topic } = puzzle as WordSearchPuzzle & {
    topic?: string;
  };

  const font = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const fontReg = pdfDoc.embedStandardFont(StandardFonts.Helvetica);

  const headerText = "Tanpa melihat HP, isi tanggal dan hari ini:";
  const headerY = A4_H - MARGIN;
  page.drawText(headerText, { x: MARGIN, y: headerY, size: 9, font });

  const availableW = A4_W - MARGIN * 2;
  const availableH = A4_H - MARGIN * 2 - 60;
  const cellSize = Math.min(
    Math.floor(Math.min(availableW, availableH) / gridSize),
    24,
  );
  const gridW = cellSize * gridSize;
  const gridH = cellSize * gridSize;
  const startX = (A4_W - gridW) / 2;
  const startY = headerY - 30;
  const fontSize = Math.max(8, cellSize - 6);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const x = startX + c * cellSize;
      const y = startY - r * cellSize - cellSize;
      const letter = grid[r][c];
      const tw = font.widthOfTextAtSize(letter, fontSize);
      page.drawText(letter, {
        x: x + (cellSize - tw) / 2,
        y: y + (cellSize - fontSize) / 2 + 2,
        size: fontSize,
        font,
      });
    }
  }

  const infoY = startY - gridH - 20;
  const topicLabel = topic ? `Topik: ${topic}` : "Topik: -";
  page.drawText(topicLabel, { x: MARGIN, y: infoY, size: 10, font });
  page.drawText(`Jumlah kata tersembunyi: ${words.length} Kata`, {
    x: MARGIN,
    y: infoY - 16,
    size: 10,
    font: fontReg,
  });
}

function drawAnswerKeyPages(pdfDoc: PDFDocument, puzzles: WordSearchPuzzle[]) {
  const font = pdfDoc.embedStandardFont(StandardFonts.HelveticaBold);
  const fontReg = pdfDoc.embedStandardFont(StandardFonts.Helvetica);

  const PER_PAGE = ANSWER_KEY_PER_ROW * ANSWER_KEY_PER_COL;
  const { slotW, slotH } = getAnswerKeyLayout();

  for (let pageStart = 0; pageStart < puzzles.length; pageStart += PER_PAGE) {
    const page = pdfDoc.addPage([A4_W, A4_H]);
    page.drawText("Answer Key", {
      x: MARGIN,
      y: A4_H - MARGIN + 4,
      size: 10,
      font,
    });

    const batch = puzzles.slice(pageStart, pageStart + PER_PAGE);
    for (let idx = 0; idx < batch.length; idx++) {
      const puzzle = batch[idx];
      const col = idx % ANSWER_KEY_PER_ROW;
      const row = Math.floor(idx / ANSWER_KEY_PER_ROW);

      const slotX = MARGIN + col * slotW;
      const slotY = A4_H - MARGIN - 16 - row * slotH;

      const { grid, placements, gridSize } = puzzle;

      const answerCells = new Set<string>();
      for (const p of placements) {
        const dr = p.direction === "H" ? 0 : 1;
        const dc = p.direction === "V" ? 0 : p.direction === "H" ? 1 : 1;
        for (let i = 0; i < p.word.length; i++) {
          answerCells.add(`${p.row + dr * i},${p.col + dc * i}`);
        }
      }

      const cellSize = Math.min(
        (slotW - 8) / gridSize,
        (slotH - 20) / gridSize,
        12,
      );
      const fs = Math.max(4, cellSize - 4);
      const gridW = cellSize * gridSize;
      const startX = slotX + (slotW - gridW) / 2;
      const startY = slotY - 14;

      page.drawText(`#${pageStart + idx + 1}`, {
        x: startX,
        y: slotY - 2,
        size: 7,
        font: fontReg,
      });

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const x = startX + c * cellSize;
          const y = startY - r * cellSize - cellSize;
          const letter = grid[r][c];
          const isAnswer = answerCells.has(`${r},${c}`);

          if (isAnswer) {
            page.drawRectangle({
              x,
              y,
              width: cellSize,
              height: cellSize,
              color: rgb(0.8, 0.9, 1),
            });
          }

          const tw = font.widthOfTextAtSize(letter, fs);
          page.drawText(letter, {
            x: x + (cellSize - tw) / 2,
            y: y + (cellSize - fs) / 2 + 1,
            size: fs,
            font: isAnswer ? font : fontReg,
            color: isAnswer ? rgb(0, 0.3, 0.8) : rgb(0.4, 0.4, 0.4),
          });
        }
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { puzzles } = body as { puzzles: WordSearchPuzzle[] };

  if (!puzzles || puzzles.length === 0) {
    return NextResponse.json({ error: "No puzzles provided" }, { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < puzzles.length; i++) {
    drawWordSearchPage(pdfDoc, puzzles[i]);
  }

  drawAnswerKeyPages(pdfDoc, puzzles);

  return sendPdfResponse(pdfDoc, "word-search.pdf");
}
