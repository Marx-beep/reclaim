import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "\"Segoe UI\"",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.06)",
        hover: "0 8px 20px rgba(15, 23, 42, 0.12)"
      },
      colors: {
        background: "hsl(210 20% 98%)",
        foreground: "hsl(222 47% 11%)",
        card: "hsl(0 0% 100%)",
        muted: "hsl(210 16% 96%)",
        primary: "hsl(204 88% 40%)",
        success: "hsl(142 71% 45%)",
        warning: "hsl(35 92% 50%)"
      }
    }
  },
  plugins: []
};

export default config;
