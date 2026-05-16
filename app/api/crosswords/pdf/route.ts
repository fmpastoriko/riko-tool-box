import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { CrosswordPuzzle, CrosswordPlacement } from "@/lib/crosswordPuzzle";
import { sendPdfResponse } from "@/lib/pdfUtils";
import {
  A4_W,
  A4_H,
  MARGIN,
  ANSWER_KEY_PER_ROW,
  ANSWER_KEY_PER_COL,
  getAnswerKeyLayout,
} from "@/lib/pdfLayout";

function wrapText(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function computePrefilledCells(puzzle: CrosswordPuzzle): Set<string> {
  const set = new Set<string>();
  const prefilled = new Set((puzzle.prefilledWords ?? []).map((w) => w.toUpperCase()));
  if (prefilled.size === 0) return set;
  for (const p of puzzle.placements) {
    if (!prefilled.has(p.word.toUpperCase())) continue;
    const dr = p.direction === "across" ? 0 : 1;
    const dc = p.direction === "across" ? 1 : 0;
    for (let i = 0; i < p.word.length; i++) {
      set.add(`${p.row + dr * i},${p.col + dc * i}`);
    }
  }
  return set;
}

function drawGrid(
  page: PDFPage,
  puzzle: CrosswordPuzzle,
  font: PDFFont,
  fontReg: PDFFont,
  showLetters: boolean,
  topY: number,
  maxW: number,
  maxH: number,
): { bottomY: number; cellSize: number } {
  const { grid, numbers, width, height } = puzzle;
  const cellSize = Math.min(Math.floor(maxW / width), Math.floor(maxH / height), 28);
  const gridW = cellSize * width;
  const startX = (A4_W - gridW) / 2;
  const startY = topY;
  const prefilledCells = computePrefilledCells(puzzle);

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const x = startX + c * cellSize;
      const y = startY - r * cellSize - cellSize;
      const letter = grid[r][c];
      if (letter === null) continue;
      page.drawRectangle({
        x,
        y,
        width: cellSize,
        height: cellSize,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.6,
        color: rgb(1, 1, 1),
      });
      const num = numbers[`${r},${c}`];
      if (num) {
        page.drawText(String(num), {
          x: x + 1.5,
          y: y + cellSize - 7,
          size: 5.5,
          font: fontReg,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
      const isPrefilled = prefilledCells.has(`${r},${c}`);
      if (showLetters || isPrefilled) {
        const fs = Math.max(8, cellSize - 10);
        const tw = font.widthOfTextAtSize(letter, fs);
        page.drawText(letter, {
          x: x + (cellSize - tw) / 2,
          y: y + (cellSize - fs) / 2 + 1,
          size: fs,
          font,
          color: showLetters ? rgb(0, 0.3, 0.8) : rgb(0.2, 0.2, 0.2),
        });
      }
    }
  }
  return { bottomY: startY - cellSize * height, cellSize };
}

function drawClueColumn(
  page: PDFPage,
  font: PDFFont,
  fontReg: PDFFont,
  title: string,
  clues: CrosswordPlacement[],
  x: number,
  topY: number,
  colW: number,
): number {
  let y = topY;
  page.drawText(title, { x, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
  y -= 14;
  const sorted = [...clues].sort((a, b) => a.number - b.number);
  for (const c of sorted) {
    const label = `${c.number}. `;
    const labelW = fontReg.widthOfTextAtSize(label, 9);
    page.drawText(label, { x, y, size: 9, font: fontReg });
    const lines = wrapText(fontReg, c.clue, 9, colW - labelW - 2);
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], {
        x: x + labelW,
        y: y - i * 11,
        size: 9,
        font: fontReg,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
    y -= 11 * lines.length + 3;
  }
  return y;
}

async function drawAnswerKeyPages(
  pdfDoc: PDFDocument,
  puzzles: CrosswordPuzzle[],
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

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

      const { grid, width, height } = puzzle;

      const cellSize = Math.min(
        (slotW - 8) / width,
        (slotH - 20) / height,
        14,
      );
      const fs = Math.max(4, cellSize - 6);
      const gridW = cellSize * width;
      const startX = slotX + (slotW - gridW) / 2;
      const startY = slotY - 14;

      page.drawText(`#${pageStart + idx + 1}`, {
        x: startX,
        y: slotY - 2,
        size: 7,
        font: fontReg,
      });

      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const letter = grid[r][c];
          if (letter === null) continue;
          const x = startX + c * cellSize;
          const y = startY - r * cellSize - cellSize;
          page.drawRectangle({
            x,
            y,
            width: cellSize,
            height: cellSize,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 0.4,
            color: rgb(0.8, 0.9, 1),
          });
          const tw = font.widthOfTextAtSize(letter, fs);
          page.drawText(letter, {
            x: x + (cellSize - tw) / 2,
            y: y + (cellSize - fs) / 2 + 1,
            size: fs,
            font,
            color: rgb(0, 0.3, 0.8),
          });
        }
      }
    }
  }
}

async function drawPuzzlePage(
  pdfDoc: PDFDocument,
  puzzle: CrosswordPuzzle,
  index: number,
  total: number,
  showLetters: boolean,
): Promise<void> {
  const page = pdfDoc.addPage([A4_W, A4_H]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const header = puzzle.topic ? `Topik: ${puzzle.topic}` : "Crosswords";
  page.drawText(header, {
    x: MARGIN,
    y: A4_H - MARGIN,
    size: 12,
    font,
  });
  const sub = `Tingkat: ${puzzle.difficulty ?? "-"}  •  ${index + 1} / ${total}`;
  page.drawText(sub, {
    x: MARGIN,
    y: A4_H - MARGIN - 14,
    size: 9,
    font: fontReg,
    color: rgb(0.4, 0.4, 0.4),
  });

  const gridTopY = A4_H - MARGIN - 36;
  const gridMaxW = A4_W - MARGIN * 2;
  const gridMaxH = (A4_H - MARGIN * 2) * 0.55;
  const { bottomY } = drawGrid(
    page,
    puzzle,
    font,
    fontReg,
    showLetters,
    gridTopY,
    gridMaxW,
    gridMaxH,
  );

  const across = puzzle.placements.filter((p) => p.direction === "across");
  const down = puzzle.placements.filter((p) => p.direction === "down");
  const colTop = bottomY - 20;
  const colW = (A4_W - MARGIN * 2 - 16) / 2;
  drawClueColumn(page, font, fontReg, "Mendatar", across, MARGIN, colTop, colW);
  drawClueColumn(
    page,
    font,
    fontReg,
    "Menurun",
    down,
    MARGIN + colW + 16,
    colTop,
    colW,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { puzzles } = body as { puzzles: CrosswordPuzzle[] };

  if (!puzzles || puzzles.length === 0) {
    return NextResponse.json({ error: "No puzzles provided" }, { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();
  for (let i = 0; i < puzzles.length; i++) {
    await drawPuzzlePage(pdfDoc, puzzles[i], i, puzzles.length, false);
  }
  await drawAnswerKeyPages(pdfDoc, puzzles);

  return sendPdfResponse(pdfDoc, "crosswords.pdf");
}
