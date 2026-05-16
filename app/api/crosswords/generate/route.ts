import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/llm";
import { checkRateLimit } from "@/lib/rateLimit";
import { neonDb } from "@/lib/db";
import { getRequestContext } from "@/lib/requestContext";

type Difficulty = "easy" | "medium" | "hard";

const RECENT_SESSION_LIMIT = 20;
const REVIEW_DELAY_DAYS = 7;

function isCleanClueGeneric(word: string, clue: string): boolean {
  if (clue.length < 12) return false;
  if (clue.split(/\s+/).filter(Boolean).length < 4) return false;
  const c = clue.toLowerCase();
  const w = word.toLowerCase();
  if (w.length < 3) return false;
  if (c.includes(w)) return false;
  const stem = w.length > 5 ? w.slice(0, w.length - 2) : null;
  if (stem && stem.length >= 4 && c.includes(stem)) return false;
  return true;
}

async function fillFromLlm(
  topic: string,
  needed: number,
  skip: Set<string>,
  owner: boolean,
): Promise<{ word: string; clue: string }[]> {
  if (needed <= 0) return [];
  const skipBlock =
    skip.size > 0
      ? `\nJANGAN pakai kata-kata berikut: ${Array.from(skip).slice(0, 200).join(", ")}`
      : "";
  const prompt = `Buatkan ${needed + 3} pasangan kata + petunjuk Bahasa Indonesia umum bertema longgar "${topic}".
Output HANYA JSON array: [{"word":"KATA","clue":"petunjuk"}].
"word" huruf kapital A-Z, 3-12 huruf, tanpa spasi.
"clue" Bahasa Indonesia, minimal 4 kata, maksimal 70 karakter.
KETAT: clue TIDAK BOLEH mengandung kata jawabannya atau bentuk dasarnya. Cek substring.
Clue harus spesifik (deskripsi fungsi/ciri/konteks unik), bukan generik seperti "Hewan" atau "Tempat mobil".
Hindari duplikasi.${skipBlock}`;
  try {
    const { text } = await generateText(prompt, owner);
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start < 0 || end < 0) return [];
    const parsed = JSON.parse(clean.slice(start, end + 1)) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: { word: string; clue: string }[] = [];
    const seen = new Set(skip);
    for (const c of parsed as { word?: unknown; clue?: unknown }[]) {
      const word =
        typeof c.word === "string"
          ? c.word.toUpperCase().replace(/[^A-Z]/g, "")
          : "";
      const clue = typeof c.clue === "string" ? c.clue.trim() : "";
      if (word.length < 3 || word.length > 15 || !clue) continue;
      if (!isCleanClueGeneric(word, clue)) continue;
      if (seen.has(word)) continue;
      seen.add(word);
      out.push({ word, clue });
      if (out.length >= needed) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function ensureTable() {
  await neonDb`CREATE TABLE IF NOT EXISTS tts_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    words_json TEXT NOT NULL,
    hashed_ip TEXT,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await neonDb`ALTER TABLE tts_sessions ADD COLUMN IF NOT EXISTS user_session_index INT`;
  await neonDb`CREATE TABLE IF NOT EXISTS tts_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    clue TEXT NOT NULL,
    marked_at_session_count INT NOT NULL DEFAULT 0,
    shown_count INT NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  await neonDb`ALTER TABLE tts_review_queue ADD COLUMN IF NOT EXISTS crossword_id INT`;
  await neonDb`ALTER TABLE tts_review_queue ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ`;
}

async function getUserSessionCount(userId: string): Promise<number> {
  const rows = (await neonDb`
    SELECT COUNT(*)::int AS n FROM tts_sessions WHERE user_id = ${userId}
  `) as { n: number }[];
  return rows[0]?.n ?? 0;
}

type ReviewRow = {
  id: string;
  word: string;
  clue: string;
  marked_at_session_count: number;
  shown_count: number;
  crossword_id: number | null;
  due_at: string | null;
};

async function getDueReviews(userId: string): Promise<ReviewRow[]> {
  const rows = (await neonDb`
    SELECT id, word, clue, marked_at_session_count, shown_count, crossword_id, due_at
    FROM tts_review_queue
    WHERE user_id = ${userId}
      AND completed = FALSE
      AND due_at IS NOT NULL
      AND due_at <= NOW()
    ORDER BY due_at ASC
  `) as ReviewRow[];
  return rows;
}

async function getBannedWords(userId: string): Promise<Set<string>> {
  const rows = (await neonDb`
    SELECT words_json
    FROM tts_sessions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${RECENT_SESSION_LIMIT}
  `) as { words_json: string }[];
  const banned = new Set<string>();
  for (const row of rows) {
    try {
      const words = JSON.parse(row.words_json) as string[];
      for (const w of words) banned.add(w.toUpperCase());
    } catch {}
  }
  return banned;
}

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  easy:
    "Kata-kata yang umum dipakai sehari-hari atau pengetahuan umum dasar. " +
    "Contoh: MAKAN, RUMAH, MOBIL, MALAYSIA (negara tetangga, pengetahuan umum).",
  medium:
    "Kata-kata yang dikenal tapi tidak dipakai harian, atau pengetahuan umum tingkat menengah. " +
    "Contoh: PERAYAAN, INSPIRASI, METAMORFOSIS.",
  hard:
    "Kata-kata jarang, istilah teknis, atau pengetahuan khusus. " +
    "Contoh: TEKNOKRASI, BIOLUMINESENSI, EPISTEMOLOGI.",
};

export async function POST(req: NextRequest) {
  const limit = checkRateLimit(req, 30);
  if (!limit.allowed)
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const body = await req.json();
  const { topic, count, difficulty } = body as {
    topic: string;
    count: number;
    difficulty: Difficulty;
  };

  if (!topic || !count || count < 3 || count > 20) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }

  const { owner, hashedIp } = await getRequestContext(req);
  const userId = owner ? "owner" : hashedIp;

  await ensureTable();
  const banned = await getBannedWords(userId);
  const prevCount = await getUserSessionCount(userId);
  const newSessionIndex = prevCount + 1;
  const dueReviews = await getDueReviews(userId);
  const reviewSlots = Math.min(dueReviews.length, Math.max(0, count - 3));
  const reviewSubset = dueReviews.slice(0, reviewSlots);
  const reviewWords = new Set(reviewSubset.map((r) => r.word.toUpperCase()));
  const llmBanned = new Set<string>(
    Array.from(banned).filter((w) => !reviewWords.has(w)),
  );

  const bannedBlock =
    llmBanned.size > 0
      ? `\nDILARANG keras memakai kata-kata ini (sudah dipakai di puzzle terbaru): ${Array.from(
          llmBanned,
        )
          .slice(0, 200)
          .join(", ")}\n`
      : "";

  const forcedBlock =
    reviewWords.size > 0
      ? `\nWAJIB sertakan kata-kata berikut DAN buatkan clue untuk masing-masing: ${Array.from(
          reviewWords,
        ).join(", ")}\n`
      : "";

  const maxEnglish = Math.floor(count * 0.1);
  const llmAsk = count + 8;
  const shortQuota = Math.max(2, Math.ceil(llmAsk * 0.3));
  const medQuota = Math.max(2, Math.ceil(llmAsk * 0.3));
  const longQuota = llmAsk - shortQuota - medQuota;

  const prompt = `Buatkan ${llmAsk} pasangan kata + petunjuk untuk crossword Bahasa Indonesia bertema: "${topic}".

Tingkat kesulitan: ${difficulty.toUpperCase()}
Panduan kesulitan: ${DIFFICULTY_HINT[difficulty]}
${bannedBlock}${forcedBlock}
Jumlah pasangan kata yang harus dibuat: ${llmAsk}.

Distribusi panjang kata (WAJIB):
- Minimal ${shortQuota} kata pendek (3-5 huruf).
- Minimal ${medQuota} kata sedang (6-8 huruf).
- Sisanya (sekitar ${longQuota}) boleh panjang (9-12 huruf).
- Kata pendek penting untuk crossword bisa saling silang.

Aturan ketat:
- Output HANYA JSON array murni, tanpa markdown, tanpa penjelasan.
- Format: [{"word":"KATA","clue":"petunjuk singkat"}, ...]
- "word" huruf kapital A-Z, 3-12 huruf, tanpa spasi/tanda baca/angka.
- "clue" Bahasa Indonesia, maksimal 70 karakter, TIDAK boleh menyebutkan kata jawabannya.
- Tidak boleh ada duplikasi kata.
- Pastikan kata-kata punya huruf yang sama agar bisa bersilangan.

Petunjuk (clue) HARUS SPESIFIK, JANGAN generik, JANGAN menyebutkan kata jawabannya:
- BURUK: "Hewan" -> BAIK: "Mamalia berkaki empat suka menggonggong"
- BURUK: "Benda" -> BAIK: "Alat tulis bertinta untuk kertas"
- BURUK: "Tempat" -> BAIK: "Bangunan tempat siswa belajar pelajaran"
- BURUK: "Tempat mobil" (untuk PARKIR) -> BAIK: "Aktivitas memberhentikan kendaraan di lokasi tertentu"
- BURUK: "1 Minggu terdiri dari 7 hari" (untuk MINGGU - mengandung kata jawaban!) -> BAIK: "Periode 7 hari berurutan"
- BURUK: "Bunga" (untuk MAWAR) -> BAIK: "Bunga merah berduri lambang cinta"
- KETAT: clue TIDAK BOLEH mengandung kata jawabannya atau bentuk dasarnya (case-insensitive). Cek substring sebelum tulis.
- Clue harus jelas mendeskripsikan kata: fungsi, ciri khas, lokasi, konteks, atau fakta unik. Minimal 4 kata.
- Hindari deskripsi yang berlaku untuk banyak kata sekaligus.

Boleh (dan dianjurkan) memakai pengetahuan umum:
- Nama tokoh: "JOKOWI: Presiden Indonesia 2014-2024", "SUKARNO: Presiden pertama RI".
- Geografi: "JAKARTA: Ibukota Indonesia", "BALI: Pulau dewata".
- Hari/bulan: "JUMAT: Hari ke-5 dalam seminggu (Senin = 1)", "DESEMBER: Bulan ke-12".
- Singkatan/akronim umum: "ATM: Tempat tarik tunai".
- Lagu/buku/film terkenal, peristiwa sejarah, istilah olahraga, dll.

Bahasa kata (WAJIB diikuti):
- MAKSIMAL ${maxEnglish} kata Bahasa Inggris. TIDAK BOLEH LEBIH.
- Sisanya (${llmAsk - maxEnglish} kata) Bahasa Indonesia.
- Kata Inggris HARUS sangat umum (CAT, BOOK, RUN, APPLE, FISH). Tidak boleh istilah teknis.
- Kata Inggris: tambahkan "(Bahasa Inggris)" di AKHIR clue.
- Kata Indonesia: JANGAN tambahkan keterangan bahasa.
- Jika ragu, pilih Bahasa Indonesia.

Contoh format yang BAIK: [{"word":"ANJING","clue":"Mamalia peliharaan suka menggonggong"},{"word":"RABU","clue":"Hari ke-3 seminggu (Senin = 1)"},{"word":"JAKARTA","clue":"Ibukota Indonesia"},{"word":"PENA","clue":"Alat tulis bertinta untuk kertas"}${maxEnglish > 0 ? ',{"word":"CAT","clue":"Mamalia peliharaan yang mengeong (Bahasa Inggris)"}' : ""}]`;

  try {
    const { text } = await generateText(prompt, owner);
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("[");
    const end = clean.lastIndexOf("]");
    if (start < 0 || end < 0) throw new Error("No JSON array");
    const parsed = JSON.parse(clean.slice(start, end + 1)) as unknown;

    if (!Array.isArray(parsed)) throw new Error("Not an array");

    const llmAll = (parsed as { word?: unknown; clue?: unknown }[])
      .map((c) => ({
        word:
          typeof c.word === "string"
            ? c.word.toUpperCase().replace(/[^A-Z]/g, "")
            : "",
        clue: typeof c.clue === "string" ? c.clue.trim() : "",
      }))
      .filter(
        (c) =>
          c.word.length >= 3 &&
          c.word.length <= 15 &&
          c.clue &&
          isCleanClueGeneric(c.word, c.clue),
      );

    const llmByWord = new Map<string, string>();
    for (const c of llmAll) {
      if (!llmByWord.has(c.word)) llmByWord.set(c.word, c.clue);
    }

    const forcedOut: { word: string; clue: string }[] = [];
    for (const r of reviewSubset) {
      const w = r.word.toUpperCase();
      const clue =
        llmByWord.get(w) ||
        (r.clue && r.clue.trim()) ||
        `Kata review: ${w.toLowerCase()}`;
      forcedOut.push({ word: w, clue });
    }

    const isEnglish = (clue: string) => /\(Bahasa Inggris\)\s*$/i.test(clue);

    const seen = new Set<string>(forcedOut.map((c) => c.word));
    const extrasId: { word: string; clue: string }[] = [];
    const extrasEn: { word: string; clue: string }[] = [];
    for (const c of llmAll) {
      if (seen.has(c.word)) continue;
      if (llmBanned.has(c.word)) continue;
      seen.add(c.word);
      if (isEnglish(c.clue)) extrasEn.push(c);
      else extrasId.push(c);
    }
    const forcedEnglishCount = forcedOut.filter((c) => isEnglish(c.clue)).length;
    const englishBudget = Math.max(0, maxEnglish - forcedEnglishCount);
    const cappedEn = extrasEn.slice(0, englishBudget);

    const poolTarget = count + 10;
    const merged = [...forcedOut, ...extrasId, ...cappedEn].slice(0, poolTarget);

    if (merged.length < poolTarget) {
      const have = new Set(merged.map((c) => c.word));
      for (const w of banned) have.add(w);
      const filler = await fillFromLlm(
        topic,
        poolTarget - merged.length,
        have,
        owner,
      );
      for (const f of filler) {
        if (merged.length >= poolTarget) break;
        merged.push(f);
      }
    }

    if (merged.length < 3) {
      return NextResponse.json(
        {
          error: "Tidak cukup kata untuk membuat puzzle.",
        },
        { status: 502 },
      );
    }

    try {
      await neonDb`
        INSERT INTO tts_sessions (topic, difficulty, words_json, hashed_ip, user_id, user_session_index)
        VALUES (
          ${topic},
          ${difficulty},
          ${JSON.stringify(merged.map((c) => c.word))},
          ${hashedIp},
          ${userId},
          ${newSessionIndex}
        )
      `;
    } catch {}

    for (const r of reviewSubset) {
      try {
        await neonDb`
          UPDATE tts_review_queue
          SET completed = TRUE
          WHERE id = ${r.id}
        `;
      } catch {}
    }

    return NextResponse.json({
      crosswordId: newSessionIndex,
      clues: merged,
      reviewedWords: forcedOut.map((c) => c.word),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[crosswords/generate]", msg, e instanceof Error ? e.stack : "");
    return NextResponse.json(
      { error: `Failed to generate clues: ${msg}` },
      { status: 500 },
    );
  }
}
