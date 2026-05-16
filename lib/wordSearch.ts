export interface WordSearchOptions {
  words: string[];
  gridSize: number;
}

export interface WordPlacement {
  word: string;
  row: number;
  col: number;
  direction: "H" | "V" | "D";
}

export interface WordSearchPuzzle {
  grid: string[][];
  placements: WordPlacement[];
  words: string[];
  gridSize: number;
  topic?: string;
}

const DIRECTIONS = [
  { dr: 0, dc: 1, label: "H" as const },
  { dr: 1, dc: 0, label: "V" as const },
  { dr: 1, dc: 1, label: "D" as const },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
  size: number,
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (grid[r][c] !== "" && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function hasInvalidAdjacency(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
  size: number,
): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const isIntersection = grid[r][c] === word[i];

    if (!isIntersection) {
      for (let rr = -1; rr <= 1; rr++) {
        for (let cc = -1; cc <= 1; cc++) {
          if (rr === 0 && cc === 0) continue;
          const nr = r + rr;
          const nc = c + cc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (grid[nr][nc] !== "") {
              return true;
            }
          }
        }
      }
    }
  }

  const beforeR = row - dr;
  const beforeC = col - dc;
  if (beforeR >= 0 && beforeR < size && beforeC >= 0 && beforeC < size) {
    if (grid[beforeR][beforeC] !== "") return true;
  }

  const afterR = row + dr * word.length;
  const afterC = col + dc * word.length;
  if (afterR >= 0 && afterR < size && afterC >= 0 && afterC < size) {
    if (grid[afterR][afterC] !== "") return true;
  }

  return false;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): void {
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

function tryPlaceWord(
  grid: string[][],
  word: string,
  size: number,
): {
  row: number;
  col: number;
  dr: number;
  dc: number;
  label: "H" | "V" | "D";
} | null {
  const dirs = shuffle(DIRECTIONS);

  for (const { dr, dc, label } of dirs) {
    const maxR = dr === 0 ? size : size - word.length + 1;
    const maxC = dc === 0 ? size : size - word.length + 1;

    const rStart = Math.floor(Math.random() * maxR);
    const cStart = Math.floor(Math.random() * maxC);

    for (let r = rStart, rcnt = 0; rcnt < maxR; r = (r + 1) % maxR, rcnt++) {
      for (let c = cStart, ccnt = 0; ccnt < maxC; c = (c + 1) % maxC, ccnt++) {
        if (!canPlace(grid, word, r, c, dr, dc, size)) continue;
        if (hasInvalidAdjacency(grid, word, r, c, dr, dc, size)) continue;
        return { row: r, col: c, dr, dc, label };
      }
    }
  }

  for (const { dr, dc, label } of dirs) {
    const maxR = dr === 0 ? size : size - word.length + 1;
    const maxC = dc === 0 ? size : size - word.length + 1;

    const rStart = Math.floor(Math.random() * maxR);
    const cStart = Math.floor(Math.random() * maxC);

    for (let r = rStart, rcnt = 0; rcnt < maxR; r = (r + 1) % maxR, rcnt++) {
      for (let c = cStart, ccnt = 0; ccnt < maxC; c = (c + 1) % maxC, ccnt++) {
        if (canPlace(grid, word, r, c, dr, dc, size)) {
          return { row: r, col: c, dr, dc, label };
        }
      }
    }
  }

  return null;
}

function buildGrid(words: string[], gridSize: number): WordSearchPuzzle | null {
  const grid: string[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(""),
  );
  const placements: WordPlacement[] = [];

  const sorted = [...words].sort((a, b) => b.length - a.length);

  for (const word of sorted) {
    const result = tryPlaceWord(grid, word, gridSize);
    if (!result) return null;
    placeWord(grid, word, result.row, result.col, result.dr, result.dc);
    placements.push({
      word,
      row: result.row,
      col: result.col,
      direction: result.label,
    });
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }

  return { grid, placements, words, gridSize };
}

export function generateWordSearch(
  opts: WordSearchOptions,
): WordSearchPuzzle | null {
  const clampedSize = Math.min(Math.max(opts.gridSize, 10), 30);
  const words = opts.words
    .map((w) => w.toUpperCase().replace(/\s/g, ""))
    .filter((w) => w.length > 0 && w.length <= clampedSize);

  if (words.length === 0) return null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const result = buildGrid(shuffle(words), clampedSize);
    if (result) return result;
  }

  return null;
}

export function generateWordSearches(
  count: number,
  opts: WordSearchOptions,
): WordSearchPuzzle[] {
  const puzzles: WordSearchPuzzle[] = [];
  for (let i = 0; i < count; i++) {
    const p = generateWordSearch(opts);
    if (p) puzzles.push(p);
  }
  return puzzles;
}
