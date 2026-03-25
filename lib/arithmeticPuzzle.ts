export type Operator = "+" | "-" | "*" | "/";
export type HideTarget = "operator" | "number";

export interface PuzzleOptions {
  operators: Operator[];
  numberRange: [number, number];
  allowNegative: boolean;
  targetEquations: number;
  hidePercentage: number;
  hideTargets: HideTarget[];
}

export interface GridCell {
  type: "number" | "operator" | "equals" | "empty";
  value: string;
  hidden: boolean;
  row: number;
  col: number;
  id: string;
  axis?: "H" | "V";
}

export interface Puzzle {
  grid: GridCell[][];
  rows: number;
  cols: number;
}

const MAX_COLS = 16;
const MAX_ROWS = 22;

type CellType = "blocked" | "numeric" | "operator" | "equals";

interface GridNode {
  row: number;
  col: number;
  type: CellType;
  value?: string;
  axis?: "H" | "V";
  groupId?: number;
}

interface EquationNode {
  startRow: number;
  startCol: number;
  isVertical: boolean;
  groupId: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const OP_DISPLAY: Record<Operator, string> = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
};

function applyOp(a: number, op: Operator, b: number): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
  }
}

function getOpFromChar(c: string): Operator | null {
  if (c === "+") return "+";
  if (c === "-") return "-";
  if (c === "×") return "*";
  if (c === "÷") return "/";
  return null;
}

function isValidEquation(
  a: number,
  op: Operator,
  b: number,
  res: number,
  allowNegative: boolean,
): boolean {
  if (!allowNegative && (a < 0 || b < 0 || res < 0)) return false;
  if (op === "/" && b === 0) return false;
  if (op === "/" && a % b !== 0) return false;
  if (Math.abs(res) > 999) return false;
  return applyOp(a, op, b) === res;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a;
    a = b;
    b = t % b;
  }
  return a;
}

class PuzzleGenerator {
  private grid: GridNode[][] = [];
  private equations: EquationNode[] = [];
  private options: PuzzleOptions;
  private groupIdCounter = 0;

  constructor(opts: PuzzleOptions) {
    this.options = opts;
    this.initGrid();
  }

  private initGrid() {
    this.grid = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      const row: GridNode[] = [];
      for (let c = 0; c < MAX_COLS; c++) {
        row.push({ row: r, col: c, type: "blocked" });
      }
      this.grid.push(row);
    }
  }

  private inBounds(r: number, c: number): boolean {
    return r >= 0 && r < MAX_ROWS && c >= 0 && c < MAX_COLS;
  }

  private getCell(r: number, c: number): GridNode {
    return this.grid[r][c];
  }

  private canPlaceEquation(
    startR: number,
    startC: number,
    isV: boolean,
  ): boolean {
    const dr = isV ? 1 : 0;
    const dc = isV ? 0 : 1;

    for (let i = 0; i < 5; i++) {
      const r = startR + i * dr;
      const c = startC + i * dc;
      if (!this.inBounds(r, c)) return false;
    }

    const rEnd = startR + 4 * dr;
    const cEnd = startC + 4 * dc;

    if (isV) {
      if (
        this.inBounds(rEnd + 1, cEnd) &&
        this.getCell(rEnd + 1, cEnd).type !== "blocked"
      ) {
        return false;
      }
      if (startR > 0 && this.getCell(startR - 1, startC).type !== "blocked") {
        return false;
      }
    } else {
      if (
        this.inBounds(rEnd, cEnd + 1) &&
        this.getCell(rEnd, cEnd + 1).type !== "blocked"
      ) {
        return false;
      }
      if (startC > 0 && this.getCell(startR, startC - 1).type !== "blocked") {
        return false;
      }
    }

    for (let i = 0; i < 5; i++) {
      const r = startR + i * dr;
      const c = startC + i * dc;
      const cell = this.getCell(r, c);
      const isOpPos = i === 1;
      const isEqPos = i === 3;
      const isNumPos = i === 0 || i === 2 || i === 4;

      if (isOpPos || isEqPos) {
        if (cell.type !== "blocked") return false;
      } else if (isNumPos) {
        if (cell.type !== "blocked" && cell.type !== "numeric") return false;
        if (cell.type === "numeric" && cell.axis === (isV ? "V" : "H")) {
          return false;
        }
      }
    }

    if (isV) {
      const opCell = this.getCell(startR + 1, startC);
      if (opCell.type === "operator" && opCell.value === "=") {
        return false;
      }
    } else {
      const opCell = this.getCell(startR, startC + 1);
      if (opCell.type === "operator" && opCell.value === "=") {
        return false;
      }
    }

    return true;
  }

  private placeEquation(
    startR: number,
    startC: number,
    isV: boolean,
  ): EquationNode {
    const dr = isV ? 1 : 0;
    const dc = isV ? 0 : 1;
    const gid = this.groupIdCounter++;

    for (let i = 0; i < 5; i++) {
      const r = startR + i * dr;
      const c = startC + i * dc;
      const cell = this.getCell(r, c);
      const isOpPos = i === 1;
      const isEqPos = i === 3;

      if (isOpPos) {
        cell.type = "operator";
        cell.groupId = gid;
        cell.axis = isV ? "V" : "H";
      } else if (isEqPos) {
        cell.type = "equals";
        cell.value = "=";
        cell.groupId = gid;
        cell.axis = isV ? "V" : "H";
      } else {
        if (cell.type === "blocked") {
          cell.type = "numeric";
          cell.groupId = gid;
          cell.axis = isV ? "V" : "H";
        }
      }
    }

    const eqNode: EquationNode = {
      startRow: startR,
      startCol: startC,
      isVertical: isV,
      groupId: gid,
    };
    this.equations.push(eqNode);
    return eqNode;
  }

  private buildLayout(): boolean {
    const startR = randInt(2, MAX_ROWS - 7);
    const startC = randInt(2, MAX_COLS - 7);
    const isV = Math.random() > 0.5;

    if (!this.canPlaceEquation(startR, startC, isV)) {
      return false;
    }
    this.placeEquation(startR, startC, isV);

    const queue: { r: number; c: number; isV: boolean }[] = [];
    const numIndices = [0, 2, 4];
    const dr = isV ? 1 : 0;
    const dc = isV ? 0 : 1;

    for (const i of numIndices) {
      const r = startR + i * dr;
      const c = startC + i * dc;
      queue.push({ r, c, isV: !isV });
    }

    const targetEquations = this.options.targetEquations || 30;

    while (queue.length > 0 && this.equations.length < targetEquations) {
      const idx = randInt(0, queue.length - 1);
      const exp = queue.splice(idx, 1)[0];

      const anchor = this.getCell(exp.r, exp.c);
      if (anchor.type !== "numeric") continue;

      const positions = this.getPossiblePositions(exp.r, exp.c, exp.isV);
      const shuffled = shuffle(positions);

      for (const pos of shuffled) {
        if (this.canPlaceEquation(pos.r, pos.c, exp.isV)) {
          this.placeEquation(pos.r, pos.c, exp.isV);
          const newDr = exp.isV ? 1 : 0;
          const newDc = exp.isV ? 0 : 1;
          for (const i of numIndices) {
            const r = pos.r + i * newDr;
            const c = pos.c + i * newDc;
            queue.push({ r, c, isV: !exp.isV });
          }
          break;
        }
      }
    }

    return this.equations.length >= 5;
  }

  private getPossiblePositions(
    r: number,
    c: number,
    isV: boolean,
  ): { r: number; c: number }[] {
    const res: { r: number; c: number }[] = [];
    if (isV) {
      if (r >= 4) res.push({ r: r - 4, c });
      if (r >= 2) res.push({ r: r - 2, c });
      if (r <= MAX_ROWS - 5) res.push({ r, c });
    } else {
      if (c >= 4) res.push({ r, c: c - 4 });
      if (c >= 2) res.push({ r, c: c - 2 });
      if (c <= MAX_COLS - 5) res.push({ r, c });
    }
    return res;
  }

  private getKnownCount(eq: EquationNode): number {
    const dr = eq.isVertical ? 1 : 0;
    const dc = eq.isVertical ? 0 : 1;
    let count = 0;
    for (let i = 0; i < 5; i += 2) {
      const r = eq.startRow + i * dr;
      const c = eq.startCol + i * dc;
      if (this.getCell(r, c).value) count++;
    }
    return count;
  }

  private fillNumbers(): boolean {
    const remaining = new Set(this.equations);

    for (let iter = 0; iter < this.equations.length * 3; iter++) {
      if (remaining.size === 0) return true;

      let best: EquationNode | null = null;
      let maxKnown = -1;

      for (const eq of remaining) {
        const count = this.getKnownCount(eq);
        if (count > maxKnown) {
          maxKnown = count;
          best = eq;
        }
        if (count === 3) break;
      }

      if (best) {
        if (this.fillEquation(best)) {
          remaining.delete(best);
        } else {
          return false;
        }
      } else {
        const eq = remaining.values().next().value;
        if (eq && this.fillEquation(eq)) {
          remaining.delete(eq);
        } else {
          return false;
        }
      }
    }

    return remaining.size === 0;
  }

  private fillEquation(eq: EquationNode): boolean {
    const dr = eq.isVertical ? 1 : 0;
    const dc = eq.isVertical ? 0 : 1;
    const nums: (number | null)[] = [null, null, null];
    const cells: GridNode[] = [];

    for (let i = 0; i < 5; i += 2) {
      const r = eq.startRow + i * dr;
      const c = eq.startCol + i * dc;
      const cell = this.getCell(r, c);
      cells.push(cell);
      if (cell.value) nums[i / 2] = parseInt(cell.value, 10);
    }

    const opCell = this.getCell(eq.startRow + dr, eq.startCol + dc);
    const existingOp: Operator | null = opCell.value
      ? getOpFromChar(opCell.value)
      : null;

    const knownCount = nums.filter((n) => n !== null).length;
    const filled = this.tryFillEquation(nums, knownCount, existingOp);

    if (!filled) return false;

    const [finalNums, finalOp] = filled;

    opCell.value = OP_DISPLAY[finalOp];

    for (let i = 0; i < 3; i++) {
      cells[i].value = String(finalNums[i]);
    }
    return true;
  }

  private tryFillEquation(
    nums: (number | null)[],
    knownCount: number,
    existingOp: Operator | null,
  ): [number[], Operator] | null {
    if (knownCount === 0) {
      const ops = existingOp
        ? [existingOp]
        : shuffle([...this.options.operators]);
      for (const op of ops) {
        const gen = this.generateFullEquation(op);
        if (gen) return [[gen.a, gen.b, gen.res], op];
      }
      return null;
    }

    if (knownCount === 1) {
      const anchorIdx = nums.findIndex((n) => n !== null);
      const anchorVal = nums[anchorIdx]!;
      const ops = existingOp
        ? [existingOp]
        : shuffle([...this.options.operators]);

      for (const op of ops) {
        const gen = this.generatePartial(anchorVal, anchorIdx, op);
        if (gen) {
          const result = [gen[0], gen[1], gen[2]];
          return [result, op];
        }
      }
      return null;
    }

    if (knownCount === 2) {
      const unknownIdx = nums.findIndex((n) => n === null);
      const known = nums.filter((n) => n !== null) as number[];
      const ops = existingOp
        ? [existingOp]
        : shuffle([...this.options.operators]);

      for (const op of ops) {
        const solved = this.solveUnknown(known[0], known[1], unknownIdx, op);
        if (solved !== null) {
          const result = [...nums] as number[];
          result[unknownIdx] = solved;
          return [result, op];
        }
      }
      return null;
    }

    if (knownCount === 3) {
      if (existingOp) {
        if (
          isValidEquation(
            nums[0]!,
            existingOp,
            nums[1]!,
            nums[2]!,
            this.options.allowNegative,
          )
        ) {
          return [[nums[0]!, nums[1]!, nums[2]!], existingOp];
        }
      }

      for (const op of shuffle([...this.options.operators])) {
        if (
          isValidEquation(
            nums[0]!,
            op,
            nums[1]!,
            nums[2]!,
            this.options.allowNegative,
          )
        ) {
          return [[nums[0]!, nums[1]!, nums[2]!], op];
        }
      }
      return null;
    }

    return null;
  }

  private generateFullEquation(
    op: Operator,
  ): { a: number; b: number; res: number } | null {
    const [lo, hi] = this.options.numberRange;

    for (let i = 0; i < 100; i++) {
      let a: number, b: number, res: number;

      switch (op) {
        case "+":
          a = randInt(lo, hi);
          b = randInt(lo, hi);
          res = a + b;
          break;
        case "-":
          a = randInt(lo + 1, hi);
          b = randInt(lo, Math.min(a - 1, hi));
          if (b < lo) continue;
          res = a - b;
          break;
        case "*":
          a = randInt(Math.max(lo, 1), Math.min(hi, 15));
          b = randInt(Math.max(lo, 1), Math.min(hi, 15));
          res = a * b;
          break;
        case "/":
          b = randInt(Math.max(lo, 1), Math.min(hi, 12));
          res = randInt(lo, Math.min(hi, 50));
          a = b * res;
          break;
        default:
          continue;
      }

      if (isValidEquation(a, op, b, res, this.options.allowNegative)) {
        return { a, b, res };
      }
    }
    return null;
  }

  private generatePartial(
    anchor: number,
    anchorIdx: number,
    op: Operator,
  ): [number, number, number] | null {
    const [lo, hi] = this.options.numberRange;

    for (let i = 0; i < 100; i++) {
      let a: number, b: number, res: number;

      if (anchorIdx === 0) {
        a = anchor;
        switch (op) {
          case "+":
            b = randInt(lo, hi);
            res = a + b;
            break;
          case "-":
            b = randInt(lo, Math.min(a - 1, hi));
            if (b < lo) continue;
            res = a - b;
            break;
          case "*":
            b = randInt(Math.max(lo, 1), Math.min(hi, 12));
            res = a * b;
            break;
          case "/":
            if (a === 0) continue;
            b = randInt(Math.max(lo, 1), Math.min(hi, Math.abs(a)));
            if (a % b !== 0) {
              const g = gcd(a, b);
              if (g >= lo && g <= hi) b = g;
              else continue;
            }
            res = Math.floor(a / b);
            break;
          default:
            continue;
        }
      } else if (anchorIdx === 1) {
        b = anchor;
        switch (op) {
          case "+":
            a = randInt(lo, hi);
            res = a + b;
            break;
          case "-":
            a = randInt(Math.max(lo, b + 1), hi);
            if (a < lo) continue;
            res = a - b;
            break;
          case "*":
            a = randInt(Math.max(lo, 1), Math.min(hi, 12));
            res = a * b;
            break;
          case "/":
            a = randInt(Math.max(lo, 1), Math.min(hi, 12)) * b;
            res = a / b;
            break;
          default:
            continue;
        }
      } else {
        res = anchor;
        switch (op) {
          case "+":
            a = randInt(lo, Math.min(hi, Math.max(lo, res - 1)));
            b = res - a;
            if (b < lo || b > hi) continue;
            break;
          case "-":
            a = randInt(Math.max(lo, res + 1), hi);
            if (a < lo) continue;
            b = a - res;
            break;
          case "*":
            if (res === 0) {
              a = 0;
              b = randInt(lo, hi);
            } else {
              const divisors: number[] = [];
              for (
                let d = Math.max(lo, 1);
                d <= Math.min(hi, Math.abs(res));
                d++
              ) {
                if (res % d === 0) divisors.push(d);
              }
              if (divisors.length === 0) continue;
              a = divisors[randInt(0, divisors.length - 1)];
              b = res / a;
            }
            break;
          case "/":
            b = randInt(Math.max(lo, 1), Math.min(hi, 12));
            a = res * b;
            break;
          default:
            continue;
        }
      }

      if (isValidEquation(a, op, b, res, this.options.allowNegative)) {
        return [a, b, res];
      }
    }
    return null;
  }

  private solveUnknown(
    a: number,
    b: number,
    unknownIdx: number,
    op: Operator,
  ): number | null {
    let res: number;

    if (unknownIdx === 0) {
      switch (op) {
        case "+":
          res = a - b;
          break;
        case "-":
          res = a + b;
          break;
        case "*":
          if (b === 0) return null;
          res = a / b;
          break;
        case "/":
          res = a * b;
          break;
        default:
          return null;
      }
    } else if (unknownIdx === 1) {
      switch (op) {
        case "+":
          res = a - b;
          break;
        case "-":
          res = a - b;
          break;
        case "*":
          if (a === 0) return null;
          res = b / a;
          break;
        case "/":
          if (b === 0) return null;
          res = a / b;
          break;
        default:
          return null;
      }
    } else {
      res = applyOp(a, op, b);
    }

    if (!this.options.allowNegative && res < 0) return null;
    if (Math.abs(res) > 999) return null;
    if (!Number.isInteger(res)) return null;
    return res;
  }

  generate(): Puzzle | null {
    for (let attempts = 0; attempts < 20; attempts++) {
      this.initGrid();
      this.equations = [];
      this.groupIdCounter = 0;

      if (!this.buildLayout()) continue;
      if (!this.fillNumbers()) continue;

      const grid = this.exportGrid();
      this.applyHiding(grid);
      return { grid, rows: MAX_ROWS, cols: MAX_COLS };
    }
    return null;
  }

  private exportGrid(): GridCell[][] {
    const result: GridCell[][] = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < MAX_COLS; c++) {
        const node = this.grid[r][c];
        if (node.type === "blocked") {
          row.push({
            type: "empty",
            value: "",
            hidden: false,
            row: r,
            col: c,
            id: `${r}-${c}`,
          });
        } else {
          row.push({
            type: node.type === "numeric" ? "number" : node.type,
            value: node.value || "",
            hidden: false,
            row: r,
            col: c,
            id: `${r}-${c}`,
            axis: node.axis,
          });
        }
      }
      result.push(row);
    }
    return result;
  }

  private applyHiding(grid: GridCell[][]) {
    const ratio = this.options.hidePercentage / 100;
    const hideable = grid.flat().filter((c) => {
      if (
        this.options.hideTargets.includes("operator") &&
        c.type === "operator"
      ) {
        return true;
      }
      if (this.options.hideTargets.includes("number") && c.type === "number") {
        return true;
      }
      return false;
    });

    if (hideable.length === 0) return;

    const targetCount = Math.max(1, Math.floor(hideable.length * ratio));
    const shuffled = shuffle(hideable);

    for (let i = 0; i < Math.min(targetCount, shuffled.length); i++) {
      shuffled[i].hidden = true;
    }

    for (const eq of this.equations) {
      const dr = eq.isVertical ? 1 : 0;
      const dc = eq.isVertical ? 0 : 1;
      const numCells: GridCell[] = [];

      for (let i = 0; i < 5; i += 2) {
        const r = eq.startRow + i * dr;
        const c = eq.startCol + i * dc;
        const cell = grid[r][c];
        if (cell.type === "number") {
          numCells.push(cell);
        }
      }

      const allHidden = numCells.every((c) => c.hidden);
      if (allHidden && numCells.length > 0) {
        const toReveal = numCells[randInt(0, numCells.length - 1)];
        toReveal.hidden = false;
      }
    }
  }
}

export function generatePuzzle(opts: PuzzleOptions): Puzzle {
  const gen = new PuzzleGenerator(opts);
  const puzzle = gen.generate();
  if (puzzle) return puzzle;

  return {
    grid: Array(MAX_ROWS)
      .fill(null)
      .map((_, r) =>
        Array(MAX_COLS)
          .fill(null)
          .map((_, c) => ({
            type: "empty" as const,
            value: "",
            hidden: false,
            row: r,
            col: c,
            id: `${r}-${c}`,
          })),
      ),
    rows: MAX_ROWS,
    cols: MAX_COLS,
  };
}

export function generatePuzzles(count: number, opts: PuzzleOptions): Puzzle[] {
  return Array.from({ length: count }, () => generatePuzzle(opts));
}
