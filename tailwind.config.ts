import type { Config } from "tailwindcss";

// Палитра и типографика — раздел 10 ТЗ: светлый рабочий интерфейс,
// тёмно-синий + золото только для акцентов, красный только для просрочки.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F4F5F8",
        surface: "#FFFFFF",
        ink: "#1B2A4A",
        muted: "#5B6785",
        line: "#D9DDE7",
        gold: "#C9A961",
        danger: "#C4453B",
        success: "#2E7D4F"
      },
      fontFamily: {
        sans: ["var(--font-golos)", "system-ui", "sans-serif"]
      },
      borderRadius: {
        DEFAULT: "6px"
      }
    }
  },
  plugins: []
};

export default config;
