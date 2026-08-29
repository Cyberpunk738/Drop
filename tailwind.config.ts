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
      colors: {
        background: "#09090b",
        surface: {
          50: "#18181b",
          100: "#121215",
          200: "#1c1c22",
          300: "#272730",
          400: "#3f3f4a",
        },
        brand: {
          50: "#e0f8ff",
          100: "#bbf0ff",
          400: "#38bdf8",
          500: "#00d2ff",
          600: "#0284c7",
          glow: "#00f0ff",
        },
        accent: {
          emerald: "#10b981",
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          rose: "#f43f5e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "sonar": "sonar 2.5s cubic-bezier(0, 0.2, 0.8, 1) infinite",
        "sonar-delayed": "sonar 2.5s cubic-bezier(0, 0.2, 0.8, 1) 1.25s infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        sonar: {
          "0%": { transform: "scale(0.8)", opacity: "0.9" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        glow: "0 0 35px -5px rgba(0, 240, 255, 0.25)",
        "glow-emerald": "0 0 35px -5px rgba(16, 185, 129, 0.25)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [],
};

export default config;
