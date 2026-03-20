export const DEFAULT_EXTS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".py",
  ".vue",
  ".css",
];

export const EXT_GROUPS = [
  { label: "Python", exts: [".py"] },
  { label: "React / Node", exts: [".tsx", ".ts", ".jsx", ".js", ".mjs"] },
  { label: "Vue", exts: [".vue"] },
  { label: "Shared", exts: [".css", ".sql", ".json", ".md", ".gitignore"] },
];

export const ALLOWED_WRITE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".vue",
  ".css",
  ".scss",
  ".sql",
  ".json",
  ".md",
  ".html",
  ".yaml",
  ".yml",
  ".toml",
  ".txt",
]);

export const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  ".vercel",
  "__pycache__",
  ".pytest_cache",
  "coverage",
  ".cache",
]);
