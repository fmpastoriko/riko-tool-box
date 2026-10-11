import {
  FETCH_TIMEOUT_MS,
  NEWS_FEED_REVALIDATE_S,
  NEWS_FEEDS,
  NEWS_MAX_PARAGRAPHS,
  NEWS_MIN_PARAGRAPH_CHARS,
  NEWS_MIN_WORDS,
  NEWS_ORIGIN,
  NEWS_RECENT_ENTRIES,
  NEWS_TARGET_WORDS,
  type Lang,
} from "@/config/readingQuiz";
import {
  decodeEntities,
  shuffle,
  stripMarkup,
  type Reading,
} from "@/lib/readingQuiz";

interface FeedEntry {
  title: string;
  url: string;
  html: string;
}

function tag(xml: string, pattern: RegExp): string {
  return xml.match(pattern)?.[1] ?? "";
}

export function parseAtomFeed(xml: string): FeedEntry[] {
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g), ([, e]) => ({
    title: stripMarkup(tag(e, /<title[^>]*>([\s\S]*?)<\/title>/)),
    url: decodeEntities(tag(e, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)),
    html: decodeEntities(tag(e, /<content[^>]*>([\s\S]*?)<\/content>/)),
  }));
}

export function articleParagraphs(html: string): string[] {
  const body = html.replace(
    /<(blockquote|figure|aside|table)\b[\s\S]*?<\/\1>/gi,
    "",
  );
  const paragraphs = (body.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [])
    .map(stripMarkup)
    .filter(
      (p) =>
        p.length >= NEWS_MIN_PARAGRAPH_CHARS &&
        !/^(baca juga|read more)\b/i.test(p),
    );

  const picked: string[] = [];
  let words = 0;
  for (const p of paragraphs) {
    if (picked.length >= NEWS_MAX_PARAGRAPHS || words >= NEWS_TARGET_WORDS)
      break;
    picked.push(p);
    words += p.split(" ").length;
  }
  return words >= NEWS_MIN_WORDS ? picked : [];
}

export async function fetchLatestArticle(lang: Lang): Promise<Reading> {
  const res = await fetch(NEWS_FEEDS[lang], {
    next: { revalidate: NEWS_FEED_REVALIDATE_S },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`News feed error ${res.status}`);

  const entries = parseAtomFeed(await res.text()).slice(0, NEWS_RECENT_ENTRIES);

  for (const entry of shuffle(entries)) {
    const paragraphs = articleParagraphs(entry.html);
    if (!entry.title || paragraphs.length === 0) continue;
    return {
      source: "news",
      lang,
      title: entry.title,
      origin: NEWS_ORIGIN,
      url: entry.url || null,
      units: paragraphs.map((text, i) => ({ label: i + 1, text })),
    };
  }

  throw new Error("No usable article in the news feed");
}
