import type { Config } from "tailwindcss";

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
        ink: "#0A1628",
        ink2: "#0F1E38",
        line: "#1C2B4A",
        accent: "#1E5FFF",
        accent2: "#4A8BFF",
        gold: "#E8B86D",
        muted: "#8A9AB8"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"]
      },
      fontSize: {
        "hero": ["clamp(2.5rem, 7vw, 6rem)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        "display": ["clamp(2rem, 5vw, 4rem)", { lineHeight: "1", letterSpacing: "-0.01em" }]
      },
      boxShadow: {
        glow: "0 0 60px -10px rgba(30, 95, 255, 0.4)"
      },
      backgroundImage: {
        "radial-accent":
          "radial-gradient(1200px 600px at 50% -10%, rgba(30, 95, 255, 0.25), transparent 60%)",
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)"
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        shimmer: "shimmer 8s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
