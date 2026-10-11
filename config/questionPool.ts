import type { Lang } from "@/config/readingQuiz";

export interface QuestionSlot {
  category: string;
  required: boolean;
  stems: Record<Lang, string[]>;
}

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
        "Apa informasi utama paragraf N?",
      ],
      en: [
        "What is the passage mainly about?",
        "What is the best summary of the passage?",
        "What is the main purpose of the passage?",
        "What is the main idea of paragraph N?",
        "What is paragraph N mainly reporting?",
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
        "Kalimat yang isinya sama dengan paragraf N adalah ...",
        "Siapa yang ... menurut teks tersebut?",
        "Berdasarkan teks, apa yang menyebabkan ...?",
      ],
      en: [
        "According to the passage, all of the following are true, EXCEPT ...",
        "According to the passage, which of the following statements is true?",
        "Which statement best restates paragraph N?",
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
        "Kata '...' pada paragraf N paling dekat maknanya dengan kata ...",
        "Kelompok kata '...' pada paragraf N memiliki makna paling dekat dengan kelompok kata ...",
        "Sesuai dengan konteks dalam teks, kata '...' pada paragraf N memiliki makna yang berlawanan dengan kata ...",
        "Kata yang memiliki makna lebih luas dari kata '...' pada paragraf N adalah ...",
        "Kata yang paling tepat menggantikan '...' pada paragraf N adalah ...",
        "Hubungan kata '...' dan kata '...' dalam teks sama dengan hubungan kata '...' dan kata ...",
      ],
      en: [
        "As used in paragraph N, the word '...' is closest in meaning to ...",
        "The phrase '...' in paragraph N is closest in meaning to ...",
        "As used in paragraph N, the word '...' is opposite in meaning to ...",
      ],
    },
  },
  {
    category: "reference",
    required: false,
    stems: {
      id: [
        "Kata '...' pada paragraf N merujuk pada ...",
        "Frasa '...' pada paragraf N mengacu pada ...",
      ],
      en: [
        "In paragraph N, '...' refers to ...",
        "What does '...' in paragraph N refer to?",
      ],
    },
  },
  {
    category: "reasoning",
    required: false,
    stems: {
      id: [
        "Pandangan penulis terhadap ... adalah ...",
        "Mengapa penulis menyebutkan ... pada paragraf N?",
        "Simpulan yang paling tepat dari paragraf N adalah ...",
        "Berdasarkan teks, hal yang dapat disimpulkan tentang ... adalah ...",
      ],
      en: [
        "Why does the author mention ... in paragraph N?",
        "Based on the passage, what can be inferred about ...?",
        "In paragraph N, describing ... as '...' suggests that ... is ...",
        "What is the author's attitude toward ...?",
      ],
    },
  },
  {
    category: "language",
    required: false,
    stems: {
      id: [
        "Fungsi kata penghubung '...' pada paragraf N adalah ...",
        "Kata penghubung yang paling tepat untuk melengkapi kalimat '... [...] ...' adalah ...",
        "Kalimat berikut perlu dimasukkan ke dalam teks: '...'. Kalimat tersebut paling tepat ditempatkan setelah kalimat yang diawali ...",
        "Tujuan penggunaan kata '...' pada paragraf N adalah ...",
        "Perumpamaan atau ungkapan bermakna kias pada teks tersebut dapat ditemukan pada ...",
      ],
      en: [
        "In paragraph N, the use of '...' indicates that ...",
        "The comparison to '...' in paragraph N mainly helps readers understand ...",
        "What is the main function of the sentence '...' in paragraph N?",
      ],
    },
  },
];
