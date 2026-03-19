# Riko Toolbox

Personal portfolio site and developer toolbox. Built with Next.js 14, Tailwind CSS, and Neon PostgreSQL.

---

## Local Setup

### Prerequisites

- Node.js 20+
- One [Neon](https://neon.tech) project
- [Ollama](https://ollama.com) installed and running (optional — falls back to Groq if not set)
- Two Groq API keys — one for owner, one for public (free tier is fine)
- A Google Cloud project with OAuth 2.0 credentials

### 1. Clone and install

```bash
git clone https://github.com/fmpastoriko/riko-tool-box.git
cd riko-tool-box
npm install
```

### 2. Environment variables

Create a `.env.local` file in the project root:

```env
# Database
NEON_DATABASE_URL=postgresql://...

# Auth
OWNER_EMAIL=your@gmail.com
NEXT_PUBLIC_OWNER_EMAIL=your@gmail.com

# NextAuth
NEXTAUTH_SECRET=                        # generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000      # change to your Vercel URL in production

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encryption (owner data only)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=

# History secret (for template management endpoints)
# Generate: openssl rand -base64 32, then store its sha256 hash here
HISTORY_SECRET_HASH=

# Groq API keys
OWNER_GROQ_API_KEY=
PUBLIC_GROQ_API_KEY=

# Groq models (optional — defaults to llama-3.3-70b-versatile)
GROQ_CHAT_MODEL=llama-3.3-70b-versatile
GROQ_SMART_SELECT_MODEL=llama-3.3-70b-versatile

# Ollama (optional — if set, used instead of Groq)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_CHAT_MODEL=qwen2.5-coder:7b
OLLAMA_SMART_SELECT_MODEL=qwen2.5:7b
OLLAMA_CTX=16384

# Set to true to enable local repo mode in Code Briefer
NEXT_PUBLIC_LOCAL=true
```

### 3. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local)
   - `https://your-vercel-url.vercel.app/api/auth/callback/google` (production)
4. Copy Client ID and Client Secret into `.env.local`

### 4. Database setup

Run `scripts/setup-db.sql` in the Neon SQL editor.

### 5. Configure repos (Code Briefer, local only)

Create `config/repos.config.json` (gitignored):

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

## Vercel Deployment

1. Push to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Set all environment variables from `.env.local` in Vercel project settings:
   - Change `NEXTAUTH_URL` to your Vercel URL
   - Leave `NEXT_PUBLIC_LOCAL` unset or set to `false`
   - Leave `OLLAMA_URL` unset (Groq only on Vercel)
4. Deploy.

---

## Linux Autostart (systemd)

For running a stable local build that persists across reboots and is unaffected by repo changes until you explicitly deploy.

### Install the service

```bash
sudo cp riko-toolbox.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable riko-toolbox.service
```

### Deploy a new build

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

`deploy.sh` runs `git pull`, `npm ci`, `npm run build`, then restarts the service. The running instance is only replaced once the build succeeds.

### Useful commands

```bash
sudo systemctl status riko-toolbox.service
sudo journalctl -u riko-toolbox.service -f
sudo systemctl restart riko-toolbox.service
sudo systemctl stop riko-toolbox.service
```

The service depends on `ollama.service` and will start after it on boot.

---

## Architecture

### Database

One Neon project. Owner data is encrypted at rest (AES-256-GCM). Unauthenticated data is plaintext. Raw IPs are never stored — SHA-256 hash used as `user_id` for unauthenticated sessions.

### Two Groq keys

| Key | Env var | Used for |
|---|---|---|
| Owner key | `OWNER_GROQ_API_KEY` | Owner requests |
| Public key | `PUBLIC_GROQ_API_KEY` | Unauthenticated requests |

### Auth roles

| State | Who | Encryption | History access |
|---|---|---|---|
| Unauthenticated | Anyone | No | Own sessions by hashed IP |
| Owner | Whitelisted email | Yes | Full, real content |

---

## Project Structure

```
app/
  api/
    auth/[...nextauth]/  — NextAuth + Google OAuth
    chat/                — LLM streaming, sessions, messages
    compare/             — Text Compare save + history
    context/             — Code Briefer files, sessions, smart-select, apply
  login/                 — Google sign-in page
  tools/
    text-compare/        — Myers diff tool
    code-briefer/        — LLM context builder
    chatbot/             — LLM chat
  page.tsx               — Homepage
components/
  AuthButton.tsx         — Login/logout + role indicator
  Nav.tsx                — Top navigation
  RepoFileTree.tsx       — File picker modal for Code Briefer + Chatbot
config/
  models.config.ts       — Groq model list and defaults
  repos.config.json      — Local repo allowlist (gitignored)
lib/
  auth.ts                — sha256 (timing-safe), isAuthenticated, re-exports session helpers
  db.ts                  — Neon client
  encrypt.ts             — AES-256-GCM encrypt/decrypt
  fileUtils.ts           — formatSize, estimateTokens (shared)
  formatDate.ts          — formatDate (shared)
  ip.ts                  — getIp — x-real-ip first, sanitized, never spoofable
  llm.ts                 — Unified LLM client (Ollama or Groq, by auth state)
  parseSuggestion.ts     — LLM suggestion block parser
  rateLimit.ts           — In-memory per-IP rate limiter
  repos.ts               — Repo allowlist + path traversal helpers
  session.ts             — NextAuth session helpers, getServerRole()
  summarize.ts           — Per-filetype file summarisation
scripts/
  setup-db.sql           — Full schema, run in Neon SQL editor
  deploy.sh              — Build + restart systemd service
  riko-toolbox.service   — systemd unit file
data/
  timeline.ts            — Career timeline data
```

---

## Tools

| Tool | URL | Description |
|---|---|---|
| Text Compare | `/tools/text-compare` | Myers diff, side-by-side, auto-save to DB |
| Code Briefer | `/tools/code-briefer` | Join repo files + prompt into LLM context block |
| Chatbot | `/tools/chatbot` | LLM chat, persistent for owner, IP-scoped for unauthenticated |

---

## Adding a New Tool

1. Create `app/tools/your-tool/page.tsx`
2. Add API routes under `app/api/your-tool/` following existing patterns
3. Add the tool to the `TOOLS` array in `app/tools/layout.tsx`
4. Add a `ToolCard` entry in `app/tools/page.tsx`
