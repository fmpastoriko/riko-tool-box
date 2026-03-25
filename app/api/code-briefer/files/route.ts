import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_EXTS, IGNORED_DIRS } from "@/config/fileExtensions";
import { internalError } from "@/lib/apiUtils";

const CONFIG_PATH = path.join(process.cwd(), "config", "repos.config.json");

function matchesExt(name: string, exts: Set<string>): boolean {
  const ext = path.extname(name).toLowerCase();
  if (ext && exts.has(ext)) return true;
  if (!ext && exts.has("." + name.toLowerCase())) return true;
  return false;
}

function walkDir(
  dir: string,
  repoRoot: string,
  exts: Set<string>,
  results: { path: string; size: number }[] = [],
  depth = 0,
): { path: string; size: number }[] {
  if (depth > 12) return results;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".gitignore") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      walkDir(full, repoRoot, exts, results, depth + 1);
    } else if (entry.isFile()) {
      if (!matchesExt(entry.name, exts)) continue;
      let size = 0;
      try {
        size = fs.statSync(full).size;
      } catch {}
      results.push({ path: path.relative(repoRoot, full), size });
    }
  }
  return results;
}

export async function GET() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return NextResponse.json({ repos: [] });
    const repos: { label: string; path: string }[] = JSON.parse(
      fs.readFileSync(CONFIG_PATH, "utf-8"),
    );
    return NextResponse.json({ repos });
  } catch {
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { repoPath, extensions } = (await req.json()) as {
      repoPath: string;
      extensions?: string[];
    };

    if (!repoPath)
      return NextResponse.json({ error: "repoPath required" }, { status: 400 });

    if (!fs.existsSync(CONFIG_PATH))
      return NextResponse.json(
        { error: "repos.config.json not found" },
        { status: 404 },
      );

    const repos: { label: string; path: string }[] = JSON.parse(
      fs.readFileSync(CONFIG_PATH, "utf-8"),
    );
    const repo = repos.find((r) => r.path === repoPath);
    if (!repo)
      return NextResponse.json(
        { error: "Repo not in allowlist" },
        { status: 403 },
      );

    const exts =
      extensions && extensions.length > 0
        ? new Set(extensions.map((e) => (e.startsWith(".") ? e : `.${e}`)))
        : new Set(DEFAULT_EXTS);

    const files = walkDir(repoPath, repoPath, exts);
    return NextResponse.json({ files });
  } catch {
    return internalError();
  }
}
