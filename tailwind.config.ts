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
        ink: "#070707",
        paper: "#ffffff",
        fog: "#f2f2f2",
        stone: "#a2a2a9",
        graphite: "#797979",
        border: "rgba(7, 7, 7, 0.08)",
        "border-stone": "#a2a2a9",
      },
      fontFamily: {
        editorial: ["var(--font-editorial)", "Newsreader", "serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        caption: ["12px", { lineHeight: "1.2", letterSpacing: "0.02em" }],
        body: ["16px", { lineHeight: "1.4" }],
        subheading: ["27px", { lineHeight: "1.3", letterSpacing: "-0.04em" }],
        heading: ["75px", { lineHeight: "1.0", letterSpacing: "-0.04em" }],
        "heading-lg": ["100px", { lineHeight: "0.85", letterSpacing: "-0.045em" }],
        display: ["180px", { lineHeight: "0.8", letterSpacing: "-0.05em" }],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "4px",
        md: "4px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "4px",
        full: "4px", // Enforce 4px ceiling per 14islands guidelines
      },
      boxShadow: {
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
