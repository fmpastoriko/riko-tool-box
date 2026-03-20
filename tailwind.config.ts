import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Plus Jakarta Sans'", "sans-serif"],
      },
      colors: {
        "dark-bg": "#0d0d0f",
        "dark-surface": "#17171a",
        "dark-border": "#27272b",
        "dark-muted": "#52525b",
        "dark-secondary": "#a1a1aa",
        "dark-primary": "#f4f4f5",
        "light-bg": "#f8f8fc",
        "light-surface": "#ffffff",
        "light-border": "#e4e4e7",
        "light-muted": "#a1a1aa",
        "light-secondary": "#52525b",
        "light-primary": "#18181b",
        accent: "#6d57f8",
        "accent-hover": "#5845d6",
        "accent-dim": "#6d57f815",
      },
      animation: { "fade-in": "fadeIn 0.4s ease forwards" },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
