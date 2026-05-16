export type Difficulty = "easy" | "medium" | "hard";

export interface CrosswordClue {
  word: string;
  clue: string;
}

export interface CrosswordPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

export interface CrosswordPuzzle {
  grid: (string | null)[][];
  placements: CrosswordPlacement[];
  numbers: Record<string, number>;
  width: number;
  height: number;
  topic?: string;
  difficulty?: Difficulty;
  prefilledWords?: string[];
}

const MAX_DIM = 30;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Dir = "across" | "down";
type Placed = { word: string; clue: string; row: number; col: number; direction: Dir };

function dirVec(dir: Dir): [number, number] {
  return dir === "across" ? [0, 1] : [1, 0];
}

function isValid(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: Dir,
  isFirst: boolean,
): boolean {
  const H = grid.length;
  const W = grid[0].length;
  const [dr, dc] = dirVec(dir);

  if (row < 0 || col < 0) return false;
  const endR = row + dr * (word.length - 1);
  const endC = col + dc * (word.length - 1);
  if (endR >= H || endC >= W) return false;

  const beforeR = row - dr;
  const beforeC = col - dc;
  if (beforeR >= 0 && beforeC >= 0 && beforeR < H && beforeC < W) {
    if (grid[beforeR][beforeC] !== null) return false;
  }
  const afterR = endR + dr;
  const afterC = endC + dc;
  if (afterR >= 0 && afterC >= 0 && afterR < H && afterC < W) {
    if (grid[afterR][afterC] !== null) return false;
  }

  let intersections = 0;
  const pdr = dc;
  const pdc = dr;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];
    if (cell !== null) {
      if (cell !== word[i]) return false;
      intersections++;
    } else {
      const r1 = r + pdr;
      const c1 = c + pdc;
      const r2 = r - pdr;
      const c2 = c - pdc;
      if (r1 >= 0 && c1 >= 0 && r1 < H && c1 < W && grid[r1][c1] !== null)
        return false;
      if (r2 >= 0 && c2 >= 0 && r2 < H && c2 < W && grid[r2][c2] !== null)
        return false;
    }
  }

  if (!isFirst && intersections === 0) return false;
  return true;
}

function place(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: Dir,
): void {
  const [dr, dc] = dirVec(dir);
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

function unplace(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  dir: Dir,
  preserve: Set<string>,
): void {
  const [dr, dc] = dirVec(dir);
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (!preserve.has(`${r},${c}`)) grid[r][c] = null;
  }
}

function findCandidates(
  word: string,
  placed: Placed[],
): { row: number; col: number; dir: Dir }[] {
  const out: { row: number; col: number; dir: Dir }[] = [];
  for (const p of placed) {
    const [pdr, pdc] = dirVec(p.direction);
    for (let j = 0; j < p.word.length; j++) {
      const letter = p.word[j];
      const ir = p.row + pdr * j;
      const ic = p.col + pdc * j;
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== letter) continue;
        const newDir: Dir = p.direction === "across" ? "down" : "across";
        const [ndr, ndc] = dirVec(newDir);
        const startR = ir - ndr * i;
        const startC = ic - ndc * i;
        out.push({ row: startR, col: startC, dir: newDir });
      }
    }
  }
  return shuffle(out);
}

function buildGrid(
  clues: CrosswordClue[],
  size: number,
): { placed: Placed[]; grid: (string | null)[][] } | null {
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array<string | null>(size).fill(null),
  );
  const placed: Placed[] = [];

  const sorted = [...clues].sort((a, b) => b.word.length - a.word.length);
  if (sorted.length === 0) return null;

  const first = sorted[0];
  const startCol = Math.floor((size - first.word.length) / 2);
  const startRow = Math.floor(size / 2);
  if (!isValid(grid, first.word, startRow, startCol, "across", true)) return null;
  place(grid, first.word, startRow, startCol, "across");
  placed.push({
    word: first.word,
    clue: first.clue,
    row: startRow,
    col: startCol,
    direction: "across",
  });

  function tryFit(remaining: CrosswordClue[]): boolean {
    if (remaining.length === 0) return true;
    const c = remaining[0];
    const candidates = findCandidates(c.word, placed);
    for (const cand of candidates) {
      if (!isValid(grid, c.word, cand.row, cand.col, cand.dir, false)) continue;
      const existing = new Set<string>();
      const [dr, dc] = dirVec(cand.dir);
      for (let i = 0; i < c.word.length; i++) {
        const r = cand.row + dr * i;
        const cc = cand.col + dc * i;
        if (grid[r][cc] !== null) existing.add(`${r},${cc}`);
      }
      place(grid, c.word, cand.row, cand.col, cand.dir);
      placed.push({
        word: c.word,
        clue: c.clue,
        row: cand.row,
        col: cand.col,
        direction: cand.dir,
      });
      if (tryFit(remaining.slice(1))) return true;
      placed.pop();
      unplace(grid, c.word, cand.row, cand.col, cand.dir, existing);
    }
    return false;
  }

  const rest = sorted.slice(1);
  if (rest.length > 0 && !tryFit(rest)) {
    return null;
  }

  return { placed, grid };
}

function buildGridGreedy(
  clues: CrosswordClue[],
  size: number,
  targetCount: number,
): { placed: Placed[]; grid: (string | null)[][] } {
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array<string | null>(size).fill(null),
  );
  const placed: Placed[] = [];

  const sorted = [...clues].sort((a, b) => b.word.length - a.word.length);
  if (sorted.length === 0) return { placed, grid };

  const first = sorted[0];
  const startCol = Math.floor((size - first.word.length) / 2);
  const startRow = Math.floor(size / 2);
  place(grid, first.word, startRow, startCol, "across");
  placed.push({
    word: first.word,
    clue: first.clue,
    row: startRow,
    col: startCol,
    direction: "across",
  });

  for (const c of sorted.slice(1)) {
    if (placed.length >= targetCount) break;
    const candidates = findCandidates(c.word, placed);
    for (const cand of candidates) {
      if (!isValid(grid, c.word, cand.row, cand.col, cand.dir, false)) continue;
      place(grid, c.word, cand.row, cand.col, cand.dir);
      placed.push({
        word: c.word,
        clue: c.clue,
        row: cand.row,
        col: cand.col,
        direction: cand.dir,
      });
      break;
    }
  }

  return { placed, grid };
}

function trim(
  grid: (string | null)[][],
  placed: Placed[],
): { grid: (string | null)[][]; placed: Placed[] } {
  let minR = grid.length;
  let maxR = -1;
  let minC = grid[0].length;
  let maxC = -1;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] !== null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) return { grid: [[null]], placed: [] };
  const newGrid: (string | null)[][] = [];
  for (let r = minR; r <= maxR; r++) {
    const row: (string | null)[] = [];
    for (let c = minC; c <= maxC; c++) row.push(grid[r][c]);
    newGrid.push(row);
  }
  const newPlaced = placed.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));
  return { grid: newGrid, placed: newPlaced };
}

function numberCells(
  grid: (string | null)[][],
): { numbers: Record<string, number>; nextStart: Map<string, number> } {
  const H = grid.length;
  const W = grid[0].length;
  const numbers: Record<string, number> = {};
  const nextStart = new Map<string, number>();
  let n = 1;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (grid[r][c] === null) continue;
      const leftEmpty = c === 0 || grid[r][c - 1] === null;
      const topEmpty = r === 0 || grid[r - 1][c] === null;
      const rightFilled = c + 1 < W && grid[r][c + 1] !== null;
      const bottomFilled = r + 1 < H && grid[r + 1][c] !== null;
      const startsAcross = leftEmpty && rightFilled;
      const startsDown = topEmpty && bottomFilled;
      if (startsAcross || startsDown) {
        numbers[`${r},${c}`] = n;
        nextStart.set(`${r},${c}`, n);
        n++;
      }
    }
  }
  return { numbers, nextStart };
}

export interface GenerateOptions {
  clues: CrosswordClue[];
  maxSize?: number;
  topic?: string;
  difficulty?: Difficulty;
  targetCount?: number;
}

export function generateCrossword(opts: GenerateOptions): CrosswordPuzzle | null {
  const cleaned = opts.clues
    .map((c) => ({
      word: c.word.toUpperCase().replace(/[^A-Z]/g, ""),
      clue: c.clue.trim(),
    }))
    .filter((c) => c.word.length >= 3 && c.word.length <= MAX_DIM && c.clue);
  if (cleaned.length === 0) return null;

  const maxLen = Math.max(...cleaned.map((c) => c.word.length));
  const n = cleaned.length;
  const target = Math.min(opts.targetCount ?? n, n);
  const sizeFloor = Math.max(maxLen + 4, Math.ceil(Math.sqrt(target) * 5));
  const sizes = Array.from(
    new Set(
      [sizeFloor, sizeFloor + 4, sizeFloor + 8, 24, MAX_DIM]
        .map((s) => Math.min(MAX_DIM, s))
        .sort((a, b) => a - b),
    ),
  );

  let result: { placed: Placed[]; grid: (string | null)[][] } | null = null;
  for (const size of sizes) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const r = buildGridGreedy(shuffle(cleaned), size, target);
      if (!result || r.placed.length > result.placed.length) result = r;
      if (result.placed.length >= target) break;
    }
    if (result && result.placed.length >= target) break;
  }
  if (!result || result.placed.length < Math.min(target, 2)) {
    for (const size of sizes) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const sorted = [...shuffle(cleaned)].sort(
          (a, b) => b.word.length - a.word.length,
        );
        const r = buildGrid(sorted, size);
        if (r && (!result || r.placed.length > result.placed.length)) {
          result = r;
          if (result.placed.length >= target) break;
        }
      }
      if (result && result.placed.length >= target) break;
    }
  }
  if (!result) return null;

  const trimmed = trim(result.grid, result.placed);
  const { numbers } = numberCells(trimmed.grid);

  const placements: CrosswordPlacement[] = trimmed.placed.map((p) => ({
    ...p,
    number: numbers[`${p.row},${p.col}`] ?? 0,
  }));

  return {
    grid: trimmed.grid,
    placements,
    numbers,
    width: trimmed.grid[0].length,
    height: trimmed.grid.length,
    topic: opts.topic,
    difficulty: opts.difficulty,
  };
}
