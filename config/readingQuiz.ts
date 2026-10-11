export type Lang = "id" | "en";
export type Source = "news" | "bible";
export type Testament = "old" | "new";
export type PassageScope = "narrative" | "old" | "new" | "all";

export interface BibleBook {
  id: number;
  names: Record<Lang, string>;
  chapters: number;
  testament: Testament;
  narrative: boolean;
}

export const LANGS: { value: Lang; label: string }[] = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];

export const SOURCES: { value: Source; label: string }[] = [
  { value: "news", label: "Latest News" },
  { value: "bible", label: "Bible" },
];

export const PASSAGE_SCOPES: { value: PassageScope; label: string }[] = [
  { value: "narrative", label: "Narrative" },
  { value: "old", label: "Old Testament" },
  { value: "new", label: "New Testament" },
  { value: "all", label: "Whole Bible" },
];

export const QUESTION_COUNT = 5;
export const OPTIONS_PER_QUESTION = 5;

export const FETCH_TIMEOUT_MS = 10_000;

export const NEWS_ORIGIN = "The Conversation";
export const NEWS_FEEDS: Record<Lang, string> = {
  id: "https://theconversation.com/id/articles.atom",
  en: "https://theconversation.com/global/articles.atom",
};
export const NEWS_FEED_REVALIDATE_S = 900;
export const NEWS_RECENT_ENTRIES = 15;
export const NEWS_MIN_PARAGRAPH_CHARS = 80;
export const NEWS_MAX_PARAGRAPHS = 5;
export const NEWS_MIN_WORDS = 120;
export const NEWS_TARGET_WORDS = 220;

export const BIBLE_API_BASE = "https://bolls.life";
export const BIBLE_TRANSLATIONS: Record<Lang, string> = { id: "TB", en: "WEB" };
export const PASSAGE_PICK_ATTEMPTS = 5;
export const MIN_PASSAGE_VERSES = 4;
export const MAX_PASSAGE_VERSES = 15;
export const DEFAULT_PASSAGE_VERSES = 8;

function book(
  id: number,
  idName: string,
  enName: string,
  chapters: number,
  narrative: boolean,
): BibleBook {
  return {
    id,
    names: { id: idName, en: enName },
    chapters,
    testament: id < 40 ? "old" : "new",
    narrative,
  };
}

export const BIBLE_BOOKS: BibleBook[] = [
  book(1, "Kejadian", "Genesis", 50, true),
  book(2, "Keluaran", "Exodus", 40, true),
  book(3, "Imamat", "Leviticus", 27, false),
  book(4, "Bilangan", "Numbers", 36, true),
  book(5, "Ulangan", "Deuteronomy", 34, false),
  book(6, "Yosua", "Joshua", 24, true),
  book(7, "Hakim-hakim", "Judges", 21, true),
  book(8, "Rut", "Ruth", 4, true),
  book(9, "1 Samuel", "1 Samuel", 31, true),
  book(10, "2 Samuel", "2 Samuel", 24, true),
  book(11, "1 Raja-raja", "1 Kings", 22, true),
  book(12, "2 Raja-raja", "2 Kings", 25, true),
  book(13, "1 Tawarikh", "1 Chronicles", 29, false),
  book(14, "2 Tawarikh", "2 Chronicles", 36, false),
  book(15, "Ezra", "Ezra", 10, true),
  book(16, "Nehemia", "Nehemiah", 13, true),
  book(17, "Ester", "Esther", 10, true),
  book(18, "Ayub", "Job", 42, false),
  book(19, "Mazmur", "Psalms", 150, false),
  book(20, "Amsal", "Proverbs", 31, false),
  book(21, "Pengkhotbah", "Ecclesiastes", 12, false),
  book(22, "Kidung Agung", "Song of Solomon", 8, false),
  book(23, "Yesaya", "Isaiah", 66, false),
  book(24, "Yeremia", "Jeremiah", 52, false),
  book(25, "Ratapan", "Lamentations", 5, false),
  book(26, "Yehezkiel", "Ezekiel", 48, false),
  book(27, "Daniel", "Daniel", 12, true),
  book(28, "Hosea", "Hosea", 14, false),
  book(29, "Yoel", "Joel", 3, false),
  book(30, "Amos", "Amos", 9, false),
  book(31, "Obaja", "Obadiah", 1, false),
  book(32, "Yunus", "Jonah", 4, true),
  book(33, "Mikha", "Micah", 7, false),
  book(34, "Nahum", "Nahum", 3, false),
  book(35, "Habakuk", "Habakkuk", 3, false),
  book(36, "Zefanya", "Zephaniah", 3, false),
  book(37, "Hagai", "Haggai", 2, false),
  book(38, "Zakharia", "Zechariah", 14, false),
  book(39, "Maleakhi", "Malachi", 4, false),
  book(40, "Matius", "Matthew", 28, true),
  book(41, "Markus", "Mark", 16, true),
  book(42, "Lukas", "Luke", 24, true),
  book(43, "Yohanes", "John", 21, true),
  book(44, "Kisah Para Rasul", "Acts", 28, true),
  book(45, "Roma", "Romans", 16, false),
  book(46, "1 Korintus", "1 Corinthians", 16, false),
  book(47, "2 Korintus", "2 Corinthians", 13, false),
  book(48, "Galatia", "Galatians", 6, false),
  book(49, "Efesus", "Ephesians", 6, false),
  book(50, "Filipi", "Philippians", 4, false),
  book(51, "Kolose", "Colossians", 4, false),
  book(52, "1 Tesalonika", "1 Thessalonians", 5, false),
  book(53, "2 Tesalonika", "2 Thessalonians", 3, false),
  book(54, "1 Timotius", "1 Timothy", 6, false),
  book(55, "2 Timotius", "2 Timothy", 4, false),
  book(56, "Titus", "Titus", 3, false),
  book(57, "Filemon", "Philemon", 1, false),
  book(58, "Ibrani", "Hebrews", 13, false),
  book(59, "Yakobus", "James", 5, false),
  book(60, "1 Petrus", "1 Peter", 5, false),
  book(61, "2 Petrus", "2 Peter", 3, false),
  book(62, "1 Yohanes", "1 John", 5, false),
  book(63, "2 Yohanes", "2 John", 1, false),
  book(64, "3 Yohanes", "3 John", 1, false),
  book(65, "Yudas", "Jude", 1, false),
  book(66, "Wahyu", "Revelation", 22, false),
];
