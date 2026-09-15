import type { Config } from "tailwindcss";

// Тёмная палитра клуба — тёмно-синий фон со свечением + золото для
// единственного основного CTA на экране. Изменено по прямому запросу
// пользователя (см. DECISIONS.md) — заменяет светлую тему из раздела 10 ТЗ.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050B1A",
        surface: "#0E1B36",
        surface2: "#122045",
        ink: "#F2F5FA",
        muted: "#8B9BC0",
        line: "#1D2E52",
        gold: "#E8B86D",
        accent: "#2E7BFF",
        danger: "#FF6B6B",
        success: "#4ADE80"
      },
      fontFamily: {
        sans: ["var(--font-golos)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        DEFAULT: "10px"
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(46, 123, 255, 0.45)"
      },
      backgroundImage: {
        "radial-accent":
          "radial-gradient(1200px 600px at 15% -10%, rgba(46, 123, 255, 0.35), transparent 60%)",
        "radial-accent-2":
          "radial-gradient(900px 500px at 100% 30%, rgba(46, 123, 255, 0.18), transparent 60%)"
      }
    }
  },
  plugins: []
};

export default config;
