import type { Lang, Source } from "@/config/readingQuiz";

export interface QuestionSlot {
  category: string;
  required: boolean;
  stems: Record<Lang, string[]>;
}

export const UNIT_NAMES: Record<Lang, Record<Source, string>> = {
  id: { news: "paragraf", bible: "ayat" },
  en: { news: "paragraph", bible: "verse" },
};

export const QUESTION_POOL: QuestionSlot[] = [
  {
    category: "gist",
    required: true,
    stems: {
      id: [
        "Judul yang paling tepat untuk teks tersebut adalah ...",
        "Gagasan utama teks tersebut adalah ...",
        "Tujuan penulis menulis teks tersebut adalah ...",
        "Ringkasan yang paling tepat untuk teks tersebut adalah ...",
        "Apa informasi utama {unit} N?",
      ],
      en: [
        "What is the passage mainly about?",
        "What is the best summary of the passage?",
        "What is the main purpose of the passage?",
        "What is the main idea of {unit} N?",
        "What is {unit} N mainly reporting?",
      ],
    },
  },
  {
    category: "detail",
    required: true,
    stems: {
      id: [
        "Pernyataan yang sesuai dengan isi teks adalah ...",
        "Berdasarkan teks, semua pernyataan berikut benar, KECUALI ...",
        "Kalimat yang isinya sama dengan {unit} N adalah ...",
        "Siapa yang ... menurut teks tersebut?",
        "Berdasarkan teks, apa yang menyebabkan ...?",
      ],
      en: [
        "According to the passage, all of the following are true, EXCEPT ...",
        "According to the passage, which of the following statements is true?",
        "Which statement best restates {unit} N?",
        "According to the passage, who ...?",
        "According to the passage, why ...?",
      ],
    },
  },
  {
    category: "vocab",
    required: true,
    stems: {
      id: [
        "Kata '...' pada {unit} N paling dekat maknanya dengan kata ...",
        "Kelompok kata '...' pada {unit} N memiliki makna paling dekat dengan kelompok kata ...",
        "Sesuai dengan konteks dalam teks, kata '...' pada {unit} N memiliki makna yang berlawanan dengan kata ...",
        "Kata yang memiliki makna lebih luas dari kata '...' pada {unit} N adalah ...",
        "Kata yang paling tepat menggantikan '...' pada {unit} N adalah ...",
        "Hubungan kata '...' dan kata '...' dalam teks sama dengan hubungan kata '...' dan kata ...",
      ],
      en: [
        "As used in {unit} N, the word '...' is closest in meaning to ...",
        "The phrase '...' in {unit} N is closest in meaning to ...",
        "As used in {unit} N, the word '...' is opposite in meaning to ...",
      ],
    },
  },
  {
    category: "reference",
    required: false,
    stems: {
      id: [
        "Kata '...' pada {unit} N merujuk pada ...",
        "Frasa '...' pada {unit} N mengacu pada ...",
      ],
      en: [
        "In {unit} N, '...' refers to ...",
        "What does '...' in {unit} N refer to?",
      ],
    },
  },
  {
    category: "reasoning",
    required: false,
    stems: {
      id: [
        "Pandangan penulis terhadap ... adalah ...",
        "Mengapa penulis menyebutkan ... pada {unit} N?",
        "Simpulan yang paling tepat dari {unit} N adalah ...",
        "Berdasarkan teks, hal yang dapat disimpulkan tentang ... adalah ...",
      ],
      en: [
        "Why does the author mention ... in {unit} N?",
        "Based on the passage, what can be inferred about ...?",
        "In {unit} N, describing ... as '...' suggests that ... is ...",
        "What is the author's attitude toward ...?",
      ],
    },
  },
  {
    category: "language",
    required: false,
    stems: {
      id: [
        "Fungsi kata penghubung '...' pada {unit} N adalah ...",
        "Kata penghubung yang paling tepat untuk melengkapi kalimat '... [...] ...' adalah ...",
        "Kalimat berikut perlu dimasukkan ke dalam teks: '...'. Kalimat tersebut paling tepat ditempatkan setelah kalimat yang diawali ...",
        "Tujuan penggunaan kata '...' pada {unit} N adalah ...",
        "Perumpamaan atau ungkapan bermakna kias pada teks tersebut dapat ditemukan pada ...",
      ],
      en: [
        "In {unit} N, the use of '...' indicates that ...",
        "The comparison to '...' in {unit} N mainly helps readers understand ...",
        "What is the main function of the sentence '...' in {unit} N?",
      ],
    },
  },
];
