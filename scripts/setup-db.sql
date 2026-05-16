-- =============================================================================
-- Riko Toolbox: Database Migration
-- Run this in your Neon SQL editor to set up the full schema from scratch.
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- -----------------------------------------------------------------------------
-- Text Compare
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comparisons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text_a      TEXT        NOT NULL,
  text_b      TEXT        NOT NULL,
  user_id     TEXT,
  hashed_ip   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON comparisons (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparisons_hashed_ip  ON comparisons (hashed_ip);


-- -----------------------------------------------------------------------------
-- Code Briefer: Prompt Templates
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS prompt_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  used_count  INTEGER     NOT NULL DEFAULT 0,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_used ON prompt_templates (used_count DESC, sort_order ASC);

-- Default templates (idempotent: skipped if label already exists)
INSERT INTO prompt_templates (label, body, sort_order) VALUES
  ('Issues',      'Review this code for bugs and potential issues',                                                       1),
  ('Bug Fix',     'Fix the bug described in the additional prompt',                                                        2),
  ('Refactor',    'Refactor for readability and maintainability without changing overall architecture',                    3),
  ('Improvement', 'List improvements covering readability, architecture, performance, and maintainability',               4),
  ('Consolidate', 'Check for redundancy and if found, consolidate into a new shared file',                                5),
  ('Security',    'Check for security vulnerabilities and suggest fixes',                                                  6),
  ('Tests',       'Write unit tests',                                                                                      7),
  ('Explain',     'Explain what this codebase does, how pieces connect, in plain language',                               8),
  ('ELI5',        'Explain this code as simply as possible, as if to someone with no programming background',             9),
  ('Optimize DB', 'Review all database queries and suggest optimizations',                                                10),
  ('Concurrency', 'Identify race conditions, deadlocks, and thread safety problems',                                      11),
  ('Complexity',  'Identify O(N²) or worse operations and suggest better alternatives',                                   12),
  ('Docs',        'Write documentation',                                                                                   13)
ON CONFLICT DO NOTHING;


-- -----------------------------------------------------------------------------
-- Code Briefer: Sessions & Outputs
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS context_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_label      TEXT        NOT NULL,
  prompt_body       TEXT        NOT NULL,
  additional_prompt TEXT,
  files_selected    JSONB       NOT NULL DEFAULT '[]',
  llm_suggestion    TEXT,
  user_id           TEXT,
  hashed_ip         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_sessions_created_at ON context_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_sessions_hashed_ip  ON context_sessions (hashed_ip);


CREATE TABLE IF NOT EXISTS context_outputs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES context_sessions (id) ON DELETE CASCADE,
  text_output TEXT        NOT NULL,
  user_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_outputs_session_id  ON context_outputs (session_id);
CREATE INDEX IF NOT EXISTS idx_context_outputs_created_at  ON context_outputs (created_at DESC);


-- -----------------------------------------------------------------------------
-- Chatbot: Sessions & Messages
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  repo_path   TEXT,
  model       TEXT,
  user_id     TEXT,
  hashed_ip   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id    ON chat_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions (created_at DESC);


CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT        NOT NULL,
  user_id     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id  ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at  ON chat_messages (created_at DESC);


-- -----------------------------------------------------------------------------
-- LLM Key Exhaustion Tracking
-- Tracks which API keys have hit their rate/quota limit for the current window.
-- Resets are checked in application code against WIB_RESET_HOUR.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS llm_exhaustion (
  model        TEXT        NOT NULL,
  key_index    INTEGER     NOT NULL,
  exhausted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (model, key_index)
);

CREATE INDEX IF NOT EXISTS idx_llm_exhaustion_exhausted_at ON llm_exhaustion (exhausted_at DESC);


-- =============================================================================
-- Done.
-- =============================================================================