import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Puzzle, GridCell } from "@/lib/arithmeticPuzzle";
import { sendPdfResponse } from "@/lib/pdfUtils";
import {
  A4_W,
  A4_H,
  MARGIN,
  ANSWER_KEY_PER_ROW,
  ANSWER_KEY_PER_COL,
  getAnswerKeyLayout,
  getPuzzleBounds,
} from "@/lib/pdfLayout";

const FONT_SIZE = 10;
const HEADER_SIZE = 9;
const CELL = 30;

async function drawPuzzlePage(pdfDoc: PDFDocument, puzzle: Puzzle) {
  const page = pdfDoc.addPage([A4_W, A4_H]);
  const { grid, rows, cols } = puzzle;
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const bounds = getPuzzleBounds(grid.flat(), rows, cols);
  if (!bounds) return;

  const { r0, r1, c0, c1, visRows, visCols } = bounds;
  const gridW = visCols * CELL;

  const headerText = "Tanpa melihat HP, isi tanggal dan hari ini:";
  const headerY = A4_H - MARGIN;
  page.drawText(headerText, { x: MARGIN, y: headerY, size: HEADER_SIZE, font });

  const startX = (A4_W - gridW) / 2;
  const startY = headerY - 24;

  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const cell: GridCell = grid[r][c];
      const x = startX + (c - c0) * CELL;
      const y = startY - (r - r0) * CELL - CELL;

      if (cell.type === "empty") continue;

      page.drawRectangle({
        x,
        y,
        width: CELL,
        height: CELL,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.75,
      });

      if (!cell.hidden && cell.value) {
        const tw = font.widthOfTextAtSize(cell.value, FONT_SIZE);
        page.drawText(cell.value, {
          x: x + (CELL - tw) / 2,
          y: y + (CELL - FONT_SIZE) / 2 + 2,
          size: FONT_SIZE,
          font,
        });
      }
    }
  }
}

async function drawAnswerKeyPages(pdfDoc: PDFDocument, puzzles: Puzzle[]) {
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSmall = await pdfDoc.embedFont(StandardFonts.Helvetica);

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

      const { grid, rows, cols } = puzzle;
      const bounds = getPuzzleBounds(grid.flat(), rows, cols, 0);
      if (!bounds) continue;

      const { r0, r1, c0, c1, visRows, visCols } = bounds;

      const cellSize = Math.min(
        (slotW - 8) / visCols,
        (slotH - 20) / visRows,
        14,
      );
      const fs = Math.max(5, cellSize - 4);

      const gridW = visCols * cellSize;
      const gridH = visRows * cellSize;
      const startX = slotX + (slotW - gridW) / 2;
      const startY = slotY - 14;

      page.drawText(`#${pageStart + idx + 1}`, {
        x: startX,
        y: slotY - 2,
        size: 7,
        font: fontSmall,
      });

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const cell: GridCell = grid[r][c];
          const x = startX + (c - c0) * cellSize;
          const y = startY - (r - r0) * cellSize - cellSize;

          if (cell.type === "empty") continue;

          page.drawRectangle({
            x,
            y,
            width: cellSize,
            height: cellSize,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.4,
            color: cell.hidden ? rgb(0.85, 0.9, 1) : undefined,
          });

          if (cell.value) {
            const tw = fontSmall.widthOfTextAtSize(cell.value, fs);
            page.drawText(cell.value, {
              x: x + (cellSize - tw) / 2,
              y: y + (cellSize - fs) / 2 + 1,
              size: fs,
              font: fontSmall,
            });
          }
        }
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { puzzles } = body as { puzzles: Puzzle[] };

  if (!puzzles || puzzles.length === 0) {
    return NextResponse.json({ error: "No puzzles provided" }, { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();

  for (let i = 0; i < puzzles.length; i++) {
    await drawPuzzlePage(pdfDoc, puzzles[i]);
  }

  await drawAnswerKeyPages(pdfDoc, puzzles);

  return sendPdfResponse(pdfDoc, "arithmetic-puzzle.pdf");
}
