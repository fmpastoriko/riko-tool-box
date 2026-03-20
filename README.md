# Riko Toolbox

Personal portfolio site and developer toolbox. Built with Next.js 14, Tailwind CSS, and Neon PostgreSQL.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Site Structure & Routing](#3-site-structure--routing)
4. [Homepage](#4-homepage)
5. [Tools Specification](#5-tools-specification)
6. [Local Setup](#6-local-setup)
7. [Build Order & Phases](#7-build-order--phases)

---

## 1. Project Overview

This site serves a dual purpose: it introduces the developer's background and career history, and it hosts a set of fully functional developer tools demonstrating practical engineering capability across software engineering, data engineering, and data analysis.

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

| Service | Purpose | Status |
|---|---|---|
| Vercel | Hosting + CI/CD via GitHub | Active |
| Next.js API Routes | Backend endpoints | Active |
| Neon PostgreSQL | Single DB, owner data encrypted, public data plaintext | Active |
| Google OAuth | Owner authentication | Active |
| Groq API (owner keys) | LLM for owner requests | Active |
| Groq API (public key) | LLM for unauthenticated requests | Active |
| Gemini API (owner keys) | LLM for owner requests | Active |
| systemd | Local autostart + service management | Active |
| pdf-lib | PDF generation for puzzle exports | Planned |
| YouTube Data API v3 | Hololive data ingestion | Planned |
| Holodex API | Hololive talent metadata | Planned |

### 2.3 Auth & Access Control

Two states only, unauthenticated and owner. No guest role.

| State | Identity | Encryption | History |
|---|---|---|---|
| Unauthenticated | `user_id = sha256(ip)` | No | Own sessions by IP |
| Owner | Google OAuth (whitelisted email) | AES-256-GCM | Full content |

Owner is determined by matching the Google account email against `OWNER_EMAIL`. Any other Google account is rejected at the callback level.

---

## 3. Site Structure & Routing

| Route | Page | Auth |
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
- **Career Timeline:** Year-by-year, outcome-focused, work screenshots. Each entry: year, role, company, problem, what was built, architecture, impact, tech tags.
- **CV Download:** PDF download button
- **Tools Preview:** Chatbot, Code Briefer, Text Compare icons + Open All Tools shortcut

---

## 5. Tools Specification

### 5.1 Text Compare

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
| comparisons | id (uuid), text_a, text_b, user_id, hashed_ip, created_at |

Owner data is encrypted at rest. Raw IPs are never stored, SHA-256 hash used as `user_id` for unauthenticated sessions.

---

### 5.2 Code Briefer

| Attribute | Detail |
|---|---|
| Purpose | Join code files + prompt into a single LLM context block |
| Local mode | Repo dropdown from `repos.config.json` (gitignored); Apply Changes writes to disk |
| Hosted mode | File upload; token hard block at 11,000 |
| LLM | Smart Select + suggestion via unified LLM client (Groq/Gemini) |
| File summariser | Strips function bodies to signatures by default; per-file Full Context toggle |
| Apply Changes | Extension allowlist enforced server-side; ambiguous From snippets rejected |

#### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| /api/briefer/files | GET | None | Return repo list |
| /api/briefer/files | POST | None | Walk repo directory |
| /api/briefer/read | POST | None | Read file contents, LOCAL only |
| /api/briefer/smart-select | POST | None | File selection via LLM, rate limited (20/min/IP) |
| /api/briefer/apply | POST | None | Apply From/To change, LOCAL only, extension allowlist |
| /api/briefer/sessions | POST | None | Save session |
| /api/briefer/sessions | GET | Owner | Return sessions, decrypted |
| /api/briefer/templates | GET | None | Return prompt templates |
| /api/briefer/templates | POST | Owner | Create template |
| /api/briefer/templates/:id | PUT | Owner | Update template |
| /api/briefer/templates/:id | DELETE | Owner | Delete template |
| /api/briefer/templates/:id/use | POST | None | Increment used_count |

#### Database Schema

| Table | Key Columns |
|---|---|
| prompt_templates | id, label, body, used_count, sort_order, created_at |
| context_sessions | id, prompt_label, prompt_body*, additional_prompt*, files_selected, llm_suggestion*, user_id, hashed_ip, created_at |
| context_outputs | id, session_id (fk), text_output*, user_id, created_at |

*Encrypted for owner. `context_outputs` auto-purged beyond 100 sessions.

#### Hardcoded footer (appended to every output)

```
DO NOT ADD ANY COMMENTS.
THIS IS A MUST: To avoid ambiguity, if you create files, NAME THE FILES WITH THEIR PATH.
Return only code, no explanation unless asked.
Preserve existing code style and conventions.
Do not add placeholder comments like // TODO or // implement this.
If you need to tell me something, tell me through chat.
Before doing anything, explain your plan first and ask for my permission and input.
If you are in doubt, always ask me first, do not assume.
Do not make up non-existent problems for the sake of feedback. If the code is good enough, say so.
Do not use m-dash.
```

#### Extension filter defaults

| Group | Extensions |
|---|---|
| Python | `.py` |
| React / Node | `.tsx`, `.ts`, `.jsx`, `.js`, `.mjs` |
| Vue | `.vue` |
| Shared | `.css`, `.sql`, `.json`, `.md`, `.gitignore` |

---

### 5.3 Chatbot

| Attribute | Detail |
|---|---|
| Purpose | Chat with LLM, sessions persisted for owner and IP-scoped for unauthenticated |
| Unauthenticated | IP-scoped, `user_id = sha256(ip)`, demo warning shown |
| Owner | Persistent, encrypted, 10 session cap |
| Message limit | 100 per session |
| Image input | File picker + clipboard paste |
| LLM routing | Owner: Gemini/Groq chain with auto key rotation. Unauthenticated: Public Groq key |

#### API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| /api/chat | POST | None | Stream LLM response, rate limited (60/min/IP) |
| /api/chat/models | GET | None | Available models |
| /api/chat/sessions | GET | None | Owner: last 10. Unauthenticated: sessions by hashed IP |
| /api/chat/sessions | POST | None | Create session |
| /api/chat/sessions/:id | GET | None | Owner: decrypted. Unauthenticated: if IP matches |
| /api/chat/sessions/:id | DELETE | Owner | Delete session |
| /api/chat/sessions/:id/messages | POST | None | Append message |

#### Database Schema

| Table | Key Columns |
|---|---|
| chat_sessions | id, title, repo_path, model, user_id, created_at |
| chat_messages | id, session_id (fk), role, content*, user_id, created_at |

*Encrypted for owner.

---

### 5.4–5.8 (Planned)

JSON Table Viewer, Arithmetic Puzzle Generator, Word Search Generator, AI Crossword (Bahasa Indonesia), Hololive Analytics Dashboard.

---

## 6. Local Setup

### Prerequisites

- Node.js 20+
- One [Neon](https://neon.tech) project
- Groq and/or Gemini API key(s)
- A Google Cloud project with OAuth 2.0 credentials

### 1. Clone and install

```bash
git clone https://github.com/fmpastoriko/riko-tool-box.git
cd riko-tool-box
npm install
```

### 2. Database setup

Run `scripts/setup-db.sql` in the Neon SQL editor.

### 3. Environment variables

Create a `.env.local` file:

```env
# Database
NEON_DATABASE_URL=postgresql://...

# Auth
OWNER_EMAIL=your@gmail.com
NEXT_PUBLIC_OWNER_EMAIL=your@gmail.com

# NextAuth
NEXTAUTH_SECRET=             # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encryption
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=

# Gemini API keys (add more as _2, _3, etc.)
OWNER_GEMINI_API_KEY_1=

# Groq API keys (add more as _2, _3, etc.)
OWNER_GROQ_API_KEY_1=
GROQ_API_KEY_PUBLIC=

# Local mode (enables repo dropdown and Apply Changes in Code Briefer)
NEXT_PUBLIC_LOCAL=true

# LLM config (optional, these are the defaults)
# GROQ_PUBLIC_MODEL=llama-3.3-70b-versatile
# LLM_TOKEN_LIMIT=11000
# NEXT_PUBLIC_LLM_CHAIN_THRESHOLD=3000
# WIB_RESET_HOUR=8
# NEXT_PUBLIC_WIB_RESET_HOUR=8
```

### 4. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Client Secret into `.env.local`

### 5. Configure repos (Code Briefer, local only)

Copy `config/repos.config.json.example` to `config/repos.config.json`:

```json
[
  {
    "label": "my-project",
    "path": "/absolute/path/to/your/repo"
  }
]
```

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 7. Build Order & Phases

| Task | Status |
|---|---|
| Text Compare | Complete |
| Code Briefer (local mode) | Complete |
| Chatbot | Complete |
| Security hardening | Complete |
| Gemini + multi-key LLM chain | Complete |
| Code Briefer (hosted mode, file upload) | Planned |
| JSON Table Viewer | Planned |
| Arithmetic Puzzle Generator | Planned |
| Word Search Generator | Planned |
| AI Crossword (Bahasa Indonesia) | Planned |
| Homepage + Timeline polish | Planned |
| Hololive Analytics Dashboard | Planned |

---

*— End of Document,*