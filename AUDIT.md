# Code Audit: Redundancy & Security

## Task 5 — Redundant Code Blocks Found

### 1. `sha256` called inconsistently (sync vs async)

**Files affected:**

- `app/api/arithmetic-puzzle/sessions/[id]/route.ts` — uses `await sha256(ip)` (wrong, sha256 is sync)
- `app/api/word-search/sessions/[id]/route.ts` — same issue
- All other routes call `sha256(ip)` correctly without `await`

**Fix:** Remove `await` from sha256 calls in those two files.

### 2. PDF blob download logic duplicated

**Files:** `app/tools/arithmetic-puzzle/history/page.tsx`, `app/tools/word-search/history/page.tsx`
Both implement the exact same re-download flow (fetch → blob → anchor click → revokeObjectURL).

**Fix:** Already consolidated in `lib/downloadPdf.ts` with `downloadBlob` helper. History pages should use `downloadBlob`.

### 3. `ensureTable()` pattern duplicated

**Files:** `app/api/arithmetic-puzzle/sessions/route.ts`, `app/api/word-search/sessions/route.ts`
Both define and call a local `ensureTable()` function that creates a table if it doesn't exist. This is fine for now (tables differ), but the pattern of calling it on every GET/POST is wasteful. Consider running migrations once at startup or using a migration file.

### 4. `IS_LOCAL` guard duplicated

**Files:** `app/api/applier/backup/route.ts`, `app/api/applier/revert/route.ts`, `app/api/applier/route.ts`, `app/api/briefer/apply/route.ts`, `app/api/briefer/read/route.ts`
All repeat:

```ts
const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";
if (!IS_LOCAL) return NextResponse.json({ error: "..." }, { status: 403 });
```

**Fix:** Create `lib/localGuard.ts`:

```ts
import { NextResponse } from "next/server";
const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL === "true";
export function requireLocal(): NextResponse | null {
  if (IS_LOCAL) return null;
  return NextResponse.json(
    { error: "This endpoint is only available in local mode" },
    { status: 403 },
  );
}
```

### 5. `isRepoAllowed` + `resolveFilePath` + `ALLOWED_WRITE_EXTS` validation block

**Files:** `app/api/applier/backup/route.ts`, `app/api/applier/revert/route.ts`, `app/api/applier/route.ts`, `app/api/briefer/apply/route.ts`
All repeat the same 3-step validation:

1. `isRepoAllowed(repoPath)`
2. `ALLOWED_WRITE_EXTS.has(ext)`
3. `resolveFilePath(repoPath, filePath)`

**Fix:** Create `lib/validateFileWrite.ts`:

```ts
import { NextResponse } from "next/server";
import path from "path";
import { isRepoAllowed, resolveFilePath } from "@/lib/repos";
import { ALLOWED_WRITE_EXTS } from "@/config/fileExtensions";

export function validateFileWrite(
  repoPath: string,
  filePath: string,
): { abs: string } | { error: NextResponse } {
  if (!isRepoAllowed(repoPath))
    return {
      error: NextResponse.json(
        { error: "Repo not in allowlist" },
        { status: 403 },
      ),
    };
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_WRITE_EXTS.has(ext))
    return {
      error: NextResponse.json(
        { error: "File type not allowed for writing" },
        { status: 403 },
      ),
    };
  const abs = resolveFilePath(repoPath, filePath);
  if (!abs)
    return {
      error: NextResponse.json({ error: "Invalid file path" }, { status: 400 }),
    };
  return { abs };
}
```

### 6. `attachIsOwn` + owner/hashedIp session filtering

**Files:** `app/api/compare/route.ts`, `app/api/briefer/sessions/route.ts`, `app/api/arithmetic-puzzle/sessions/route.ts`, `app/api/word-search/sessions/route.ts`
All use `attachIsOwn` from `lib/sessionHelpers.ts` — good, this is already shared.

### 7. History page re-download pattern

As noted in #2, the full fetch→blob→anchor flow is duplicated in both history pages. Should use `downloadBlob` from `lib/downloadPdf.ts`.

---

## Task 6 — Security Issues Found

### 🔴 HIGH: Path traversal in `app/api/applier/delete-zip/route.ts`

```ts
if (!filename || filename.includes("/") || filename.includes("..")) {
```

This check catches `/` and `..` but does NOT catch URL-encoded variants like `%2F` or `%2e%2e`. Since `filename` comes from JSON body, it shouldn't be URL-encoded, but the existing guard is not thorough. Also, the check `abs !== ALLOWED_DIR` at the end is redundant with `startsWith(ALLOWED_DIR + path.sep)`.

**Fix:** More robust check:

```ts
const safe = /^[a-zA-Z0-9_.\-]+$/.test(filename);
if (!safe)
  return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
```

### 🔴 HIGH: `sha256` called with `await` in two routes

`app/api/arithmetic-puzzle/sessions/[id]/route.ts` and `app/api/word-search/sessions/[id]/route.ts` do `await sha256(ip)` but `sha256` is a synchronous function. This returns the string correctly in JS (await on a non-Promise returns the value), but it's semantically wrong and misleading. Not a security bug per se, but a correctness issue.

### 🟡 MEDIUM: Rate limiting is in-memory only

`lib/rateLimit.ts` uses a `Map` in module scope. In serverless/edge environments, this map resets on cold starts and doesn't share state across instances. A user could bypass rate limiting by hitting different server instances.

**Fix:** Use Redis or Neon-backed rate limiting for production.

### 🟡 MEDIUM: `OWNER_EMAIL` compared using `===` in auth — fine, but `NEXT_PUBLIC_OWNER_EMAIL` is exposed to client

In `components/chatbot/page.tsx`:

```ts
const isOwner =
  authSession?.user?.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;
```

`NEXT_PUBLIC_*` env vars are bundled into the client JS. Anyone can read the owner email from the browser. This allows targeted phishing/social engineering. Consider not exposing this and instead getting the role from a server-side session field.

### 🟡 MEDIUM: `execSync` with user-controlled file path in `lib/prettierFile.ts`

```ts
execSync(`npx prettier --write "${abs}"`, { cwd: repoPath, ... });
```

`abs` is derived from `resolveFilePath` which validates path traversal, so this is mostly safe. But the path is interpolated into a shell string with double quotes. A filename containing `"` could break out.

**Fix:** Use array form if available, or escape the path:

```ts
execSync(`npx prettier --write ${JSON.stringify(abs)}`, { ... });
```

### 🟢 LOW: `config/extensions.config.ts` is unused / duplicate of `config/fileExtensions.ts`

`config/extensions.config.ts` defines `BRIEFER_DEFAULT_EXTS` and `BRIEFER_EXT_GROUPS` but the actual code imports from `config/fileExtensions.ts`. The file appears to be dead code. Remove it to avoid confusion.

### 🟢 LOW: `lib/rateLimit.ts` store never cleaned

The in-memory `store` Map grows unboundedly. Old entries (past their `resetAt`) are never evicted. Under heavy traffic this leaks memory.

**Fix:** Add periodic cleanup or use a WeakRef approach.

### 🟢 LOW: `Content-Security-Policy` not set

No CSP headers are configured in `next.config.js`. This leaves the app open to XSS if any untrusted content is rendered.

---

## Summary Table

| #   | Type       | Severity | File(s)                                     | Action                               |
| --- | ---------- | -------- | ------------------------------------------- | ------------------------------------ |
| 1   | Bug        | Low      | arithmetic/word-search sessions [id] routes | Remove `await` from `sha256`         |
| 2   | Redundancy | —        | History pages                               | Use `downloadBlob` from lib          |
| 3   | Redundancy | —        | API routes                                  | Create `lib/localGuard.ts`           |
| 4   | Redundancy | —        | API routes                                  | Create `lib/validateFileWrite.ts`    |
| 5   | Security   | High     | delete-zip route                            | Stricter filename validation         |
| 6   | Security   | Medium   | rateLimit.ts                                | Use persistent store                 |
| 7   | Security   | Medium   | chatbot page                                | Don't expose NEXT_PUBLIC_OWNER_EMAIL |
| 8   | Security   | Medium   | prettierFile.ts                             | Use JSON.stringify for path escaping |
| 9   | Cleanup    | Low      | extensions.config.ts                        | Remove dead file                     |
| 10  | Memory     | Low      | rateLimit.ts                                | Evict stale entries                  |
