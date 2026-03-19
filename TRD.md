# Technical Requirements Document
## Personal Portfolio Website

**Role:** Software Engineer / Data Engineer / Data Analyst
**Stack:** Next.js · React · Tailwind CSS · PostgreSQL (Neon) · Vercel
**Version:** 1.5 · 2026

> This document is not final; it will be updated as more tools are added to the website.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Site Structure & Routing](#3-site-structure--routing)
4. [Homepage](#4-homepage)
5. [Authentication & Access Control](#5-authentication--access-control)
6. [Shared Libraries](#6-shared-libraries)
7. [Tools Specification](#7-tools-specification)
8. [Security Hardening](#8-security-hardening)
9. [Deployment](#9-deployment)
10. [Build Order & Phases](#10-build-order--phases)

---

## 1. Project Overview

This document defines the technical requirements for a personal portfolio website. The site serves a dual purpose: it introduces the developer's background and career history, and it hosts a set of fully functional developer tools demonstrating practical engineering capability across software engineering, data engineering, and data analysis.

### 1.1 Objectives

- Present a career timeline with outcome-focused descriptions and work screenshots
- Demonstrate SWE capability through interactive frontend and backend tools
- Provide personally useful tools for daily use
- Operate entirely on free-tier infrastructure with zero monthly cost
- (Planned) Demonstrate DE capability through a live data pipeline and analytics dashboard

### 1.2 Target Audience

| Audience | Entry Point | Goal |
|---|---|---|
| Recruiters / HR | Homepage | Assess role fit, download CV |
| Hiring Managers | Tools pages | Evaluate technical depth |
| Technical Interviewers | Tool source + architecture | Assess code quality |
| Personal use (owner) | Tools directly | Daily toolbox |
| Mom | Puzzle tools | Printable puzzles for leisure |

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14+ (App Router) | React framework, routing, SSR/SSG |
| React | 18+ | UI component library |
| Tailwind CSS | 3+ | Utility-first styling |
| TypeScript | 5+ | Type safety across codebase |
| NextAuth.js | 4+ | Authentication (Google OAuth) |

### 2.2 Infrastructure & Services

| Service / Technology | Purpose | Status |
|---|---|---|
| Vercel | Hosting + CI/CD via GitHub | Active |
| Next.js API Routes | Backend endpoints | Active |
| Neon PostgreSQL | Single DB — owner data encrypted, public data plaintext | Active |
| Google OAuth | Owner authentication | Active |
| Groq API (owner key) | LLM for owner requests | Active |
| Groq API (public key) | LLM for unauthenticated requests | Active |
| Ollama (optional) | Local LLM fallback when OLLAMA_URL is set | Active |
| systemd | Local autostart + production service management | Active |
| pdf-lib | PDF generation for puzzle exports | Planned |
| YouTube Data API v3 | Hololive data ingestion | Planned |
| Holodex API | Hololive talent metadata | Planned |

---

## 3. Site Structure & Routing

| Route | Page | Auth required |
|---|---|---|
| / | Homepage | None |
| /login | Google sign-in | None |
| /tools | Tool Directory | None |
| /tools/text-compare | Text Compare | None |
| /tools/text-compare/history | Text Compare History | Owner only |
| /tools/code-briefer | Code Briefer | None |
| /tools/code-briefer/history | Code Briefer History | Owner only |
| /tools/chatbot | Chatbot | None (unauthenticated = IP-scoped) |

---

## 4. Homepage

### 4.1 Sections

- **Hero:** Name, role label, one-sentence introduction
- **Career Timeline:** Year-by-year, outcome-focused, work screenshots
- **CV Download:** PDF download button
- **Tools Preview:** Text Compare, Code Briefer, Open All Tools shortcuts

---

## 5. Authentication & Access Control

### 5.1 Auth implementation

NextAuth.js with Google OAuth provider. Single whitelisted email (`OWNER_EMAIL` env var) maps to the owner role. Any other Google account attempting sign-in is rejected at the callback level.

No guest role. Two states only: unauthenticated and owner.

### 5.2 Role model

| State | Identity | Encryption | History |
|---|---|---|---|
| Unauthenticated | `user_id = sha256(ip)` | No | Own sessions by IP |
| Owner | Google sub via NextAuth | AES-256-GCM | Full content |

### 5.3 Tool access by role

| Feature | Unauthenticated | Owner |
|---|---|---|
| Text Compare — use tool | Yes | Yes |
| Text Compare — auto-save to DB | Yes (plaintext) | Yes (encrypted) |
| Text Compare — history | No (401) | Yes |
| Code Briefer — use tool | Yes | Yes |
| Code Briefer — Join + Smart Select | Yes | Yes |
| Code Briefer — Apply Changes | Local only | Local only |
| Code Briefer — session save | Yes (plaintext) | Yes (encrypted) |
| Code Briefer — history | No (401) | Yes |
| Chatbot — chat | Yes (IP-scoped, demo warning shown) | Yes (persistent) |
| Chatbot — session history | Own sessions by IP | Yes, all sessions |
| Chatbot — Open in Chat (from Code Briefer) | Yes (session loaded by IP match) | Yes |

### 5.4 Chatbot IP-scoped behaviour

Unauthenticated users can chat freely. Sessions are saved with `user_id = sha256(client_ip)`. The IP is extracted from `x-real-ip` first (injected by Vercel infrastructure, not spoofable), then falls back to the last entry in `x-forwarded-for`. Raw IPs are never persisted.

Users can see their own session list (up to 10, same IP) and reload sessions by ID.

A two-part banner is always shown when unauthenticated: a red warning about IP-scoped sessions, and a sign-in nudge.

### 5.5 Separate Groq credentials by auth state

| Resource | Owner env var | Public env var |
|---|---|---|
| Groq API key | `OWNER_GROQ_API_KEY` | `PUBLIC_GROQ_API_KEY` |

---

## 6. Shared Libraries

| File | Exports | Purpose |
|---|---|---|
| `lib/auth.ts` | `sha256`, `isAuthenticated` (timing-safe), re-exports from session.ts | Auth helpers |
| `lib/db.ts` | `neonDb` | Neon client |
| `lib/encrypt.ts` | `encrypt`, `decrypt`, `encryptIfOwner`, `decryptIfOwner` | AES-256-GCM |
| `lib/fileUtils.ts` | `formatSize`, `estimateTokens` | Shared file size + token helpers |
| `lib/formatDate.ts` | `formatDate` | Shared date formatter |
| `lib/ip.ts` | `getIp` | Secure IP extraction — `x-real-ip` first, sanitized |
| `lib/llm.ts` | `streamChat`, `generateText`, `getGroqKey`, `useOllama` | Unified LLM client |
| `lib/parseSuggestion.ts` | `parseSuggestion`, `SuggestionBlock` | LLM suggestion parser |
| `lib/rateLimit.ts` | `checkRateLimit` | In-memory per-IP rate limiter |
| `lib/repos.ts` | `getAllowedRepoPaths`, `isRepoAllowed`, `resolveFilePath` | Repo allowlist + path traversal |
| `lib/session.ts` | `getServerRole`, `getServerUserId`, `isOwnerRole` | NextAuth session helpers |
| `lib/summarize.ts` | `summarizeFile` | Per-filetype summariser |
| `config/models.config.ts` | `GROQ_MODELS`, defaults | Groq model list |

### lib/ip.ts

Extracts the real client IP. Prefers `x-real-ip` (set by Vercel infrastructure, not spoofable by clients) over `x-forwarded-for`. When falling back to `x-forwarded-for`, takes the last entry in the chain rather than the first. Sanitizes the result against an IP format allowlist — returns `"unknown"` if the value does not match a valid IPv4 or IPv6 pattern. Used by all routes that derive `user_id` from IP and by `lib/rateLimit.ts`.

### lib/auth.ts

`isAuthenticated` uses `crypto.timingSafeEqual` for the `HISTORY_SECRET_HASH` comparison, preventing timing attacks on the secret. `sha256` is a standard hex-encoded SHA-256 helper used for IP hashing.

### lib/encrypt.ts

AES-256-GCM. IV (12 bytes) + auth tag (16 bytes) + ciphertext stored together as base64. `ENCRYPTION_KEY` must be a 32-byte hex string. Throws at call time if key is missing or wrong length.

### lib/llm.ts

Unified LLM client. If `OLLAMA_URL` is set, Ollama is used. Otherwise falls back to Groq, using `OWNER_GROQ_API_KEY` or `PUBLIC_GROQ_API_KEY` based on auth state.

### lib/rateLimit.ts

In-memory per-IP sliding window. Uses `lib/ip.ts` for IP extraction — same spoofing protection applies. Resets on process restart (acceptable for Vercel serverless).

---

## 7. Tools Specification

### 7.1 Text Compare

| Attribute | Detail |
|---|---|
| Purpose | Compare two text blocks and highlight differences |
| Algorithm | Myers diff via jsdiff |
| Rendering | Client-side, real-time |
| DB write | Auto-saved on every comparison |
| History | Owner only |

#### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| /api/compare | POST | None | Save comparison, rate limited (30/min/IP) |
| /api/compare/history | GET | Owner | Return all comparisons, decrypted |

#### Database Schema

| Table | Key Columns |
|---|---|
| comparisons | id (uuid), text_a (encrypted for owner), text_b (encrypted for owner), user_id, hashed_ip, created_at |

---

### 7.2 Code Briefer

URL: `/tools/code-briefer`.

| Attribute | Detail |
|---|---|
| Purpose | Join code files + prompt into a single LLM context block |
| Local mode | Repo dropdown from repos.config.json; Apply Changes writes to disk |
| Hosted mode | File upload planned; token hard block at 11,000 planned |
| LLM | Smart Select + LLM Suggestion via lib/llm (Ollama or Groq) |
| File summariser | Strips signatures to name-only by default; per-file Full Context toggle |
| Apply Changes | Extension allowlist enforced server-side; ambiguous From snippets rejected |

#### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| /api/context/files | GET | None | Return repo list |
| /api/context/files | POST | None | Walk repo directory |
| /api/context/read | POST | None | Read file contents — LOCAL only |
| /api/context/smart-select | POST | None | File selection via LLM — rate limited (20/min/IP) |
| /api/context/apply | POST | None | Apply From/To change — LOCAL only, extension allowlist, ambiguity check |
| /api/context/sessions | POST | None | Save session |
| /api/context/sessions | GET | Owner | Return sessions, decrypted |
| /api/context/templates | GET | None | Return prompt templates |
| /api/context/templates | POST | Owner | Create template |
| /api/context/templates/:id | PUT | Owner | Update template |
| /api/context/templates/:id | DELETE | Owner | Delete template |
| /api/context/templates/:id/use | POST | None | Increment used_count |

#### Database Schema

| Table | Key Columns |
|---|---|
| prompt_templates | id, label, body, used_count, sort_order, created_at |
| context_sessions | id, prompt_label, prompt_body*, additional_prompt*, files_selected, llm_suggestion*, user_id, hashed_ip, created_at |
| context_outputs | id, session_id (fk), text_output*, user_id, created_at |

*Encrypted for owner.

#### Migration

```sql
ALTER TABLE context_sessions RENAME COLUMN error_log TO additional_prompt;
```

---

### 7.3 Chatbot

| Attribute | Detail |
|---|---|
| Purpose | Chat with LLM, sessions persisted for owner and IP-scoped for unauthenticated |
| Unauthenticated | IP-scoped — user_id = sha256(ip), demo warning shown |
| Owner | Persistent, encrypted, 10 session cap |
| Message limit | 100 per session |
| Image input | File picker + clipboard paste |

#### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| /api/chat | POST | None | Stream LLM response — rate limited (60/min/IP), max 50 messages, 64KB per message |
| /api/chat/models | GET | None | Available models |
| /api/chat/sessions | GET | None | Owner: last 10. Unauthenticated: sessions by hashed IP |
| /api/chat/sessions | POST | None | Create session |
| /api/chat/sessions/:id | GET | None | Owner: decrypted. Unauthenticated: plaintext if IP matches |
| /api/chat/sessions/:id | DELETE | Owner | Delete session |
| /api/chat/sessions/:id/messages | POST | None | Append message |

#### Database Schema

| Table | Key Columns |
|---|---|
| chat_sessions | id, title, repo_path, model, user_id, created_at |
| chat_messages | id, session_id (fk), role (check constraint), content*, user_id, created_at |

*Encrypted for owner.

---

### 7.4–7.8 (Planned)

JSON Table Viewer, Arithmetic Puzzle Generator, Word Search Generator, AI Crossword (Bahasa Indonesia), Hololive Analytics Dashboard.

---

## 8. Security Hardening

| Fix | Location | Detail |
|---|---|---|
| IP spoofing prevention | `lib/ip.ts` | `x-real-ip` preferred (not spoofable on Vercel); last entry of `x-forwarded-for` as fallback; IP format sanitization |
| Timing-safe secret comparison | `lib/auth.ts` | `crypto.timingSafeEqual` for `HISTORY_SECRET_HASH` |
| Path traversal | `lib/repos.ts` `resolveFilePath` | `path.sep` separator check |
| .env file block | `api/context/read` | Blocks `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test` |
| LOCAL hard-block | `api/context/read`, `api/context/apply` | Returns 403 when `LOCAL !== 'true'` |
| Write extension allowlist | `api/context/apply` | Only known source file extensions may be written |
| Ambiguous From rejection | `api/context/apply` | Returns 422 if From snippet appears more than once in file |
| Role validation | `api/chat/sessions/[id]/messages` | `role` must be `user`, `assistant`, or `system` |
| Rate limiting | `api/compare` POST, `api/chat` POST, `api/context/smart-select` POST | 30/60/20 req/min/IP respectively |
| Max body size | `api/context/smart-select` | 10MB body limit, 300 file limit |
| Max messages | `api/chat` POST | 50 messages max, 64KB per message |
| Max output size | `api/context/sessions` POST | 500KB cap on `text_output` |
| Title length | `api/chat/sessions` POST | Server-side slice to 60 chars |
| Generic errors | All routes | `catch` blocks return "Internal server error" |
| Encryption at rest | Owner data only | AES-256-GCM, all user content fields |
| Auth on history routes | compare/history, context/sessions GET | Owner only, 401 for all others |
| IP hashing | All session routes | Raw IP never stored — SHA-256 hash used as user_id |
| IP-scoped session access | `api/chat/sessions/:id` GET | Unauthenticated can only read sessions where user_id matches hashed IP |

---

## 9. Deployment

### 9.1 Vercel (production)

Push to GitHub. Vercel auto-deploys on merge to main. Set all env vars in Vercel project settings. `LOCAL` must be unset or `false`. `OLLAMA_URL` must be unset.

### 9.2 Local (systemd)

**Service file:** `scripts/riko-toolbox.service` — copy to `/etc/systemd/system/`.

**Deploy script:** `scripts/deploy.sh` — runs `git pull`, `npm ci`, `npm run build`, then `systemctl restart`. The running instance is only replaced after a successful build.

```bash
sudo cp scripts/riko-toolbox.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable riko-toolbox.service
sudo ./scripts/deploy.sh
```

---

## 10. Build Order & Phases

| Task | Status |
|---|---|
| Text Compare | Complete |
| Code Briefer (local mode) | Complete |
| Chatbot | Complete |
| Security hardening (IP, rate limiting, write allowlist) | Complete |
| Redundancy consolidation (ip, formatDate, fileUtils) | Complete |
| error_log → additional_prompt rename | Complete |
| Code Briefer (hosted mode — file upload, token hard block) | Planned |
| JSON Table Viewer | Planned |
| Arithmetic Puzzle Generator | Planned |
| Word Search Generator | Planned |
| AI Crossword (Bahasa Indonesia) | Planned |
| Homepage + Timeline polish | Planned |
| Hololive Analytics Dashboard | Planned |

---

*— End of Document —*
