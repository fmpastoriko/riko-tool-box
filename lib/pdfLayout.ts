export const A4_W = 595.28;
export const A4_H = 841.89;
export const MARGIN = 40;
export const ANSWER_KEY_PER_ROW = 3;
export const ANSWER_KEY_PER_COL = 3;

export function getAnswerKeyLayout() {
  const usableW = A4_W - MARGIN * 2;
  const usableH = A4_H - MARGIN * 2 - 20;
  const slotW = usableW / ANSWER_KEY_PER_ROW;
  const slotH = usableH / ANSWER_KEY_PER_COL;
  return { slotW, slotH };
}

export function getPuzzleBounds(
  grid: { row: number; col: number; type: string }[],
  rows: number,
  cols: number,
  pad = 1,
) {
  const nonEmpty = grid.filter((c) => c.type !== "empty");
  if (nonEmpty.length === 0) return null;

  const occupiedRows = nonEmpty.map((c) => c.row);
  const occupiedCols = nonEmpty.map((c) => c.col);
  const minRow = Math.min(...occupiedRows);
  const maxRow = Math.max(...occupiedRows);
  const minCol = Math.min(...occupiedCols);
  const maxCol = Math.max(...occupiedCols);

  const r0 = Math.max(0, minRow - pad);
  const r1 = Math.min(rows - 1, maxRow + pad);
  const c0 = Math.max(0, minCol - pad);
  const c1 = Math.min(cols - 1, maxCol + pad);

  return { r0, r1, c0, c1, visRows: r1 - r0 + 1, visCols: c1 - c0 + 1 };
}
