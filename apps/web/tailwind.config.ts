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
          "PingFang SC",
          "Microsoft YaHei",
          "Hiragino Sans GB",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        display: [
          "Inter",
          "PingFang SC",
          "Microsoft YaHei",
          "Hiragino Sans GB",
          "Segoe UI Variable Display",
          "Trebuchet MS",
          "sans-serif"
        ]
      },
      colors: {
        page: {
          bg: "#F7F8FC",
          subtle: "#F5F6FA"
        },
        surface: {
          base: "#FFFFFF",
          raised: "#FFFFFF",
          overlay: "rgba(255, 255, 255, 0.98)"
        },
        brand: {
          DEFAULT: "#5865F2",
          light: "#7B83EC",
          lighter: "#EEF0FF",
          dark: "#4F5BEF",
          muted: "#A8B3F4"
        },
        btn: {
          primary: "#5865F2",
          primaryHover: "#4F5BEF",
          primaryLight: "#EEF0FF",
          primaryText: "#FFFFFF",
          solid: "#4B5563",
          solidHover: "#3D4452",
          solidLight: "#F5F6FA",
          solidText: "#FFFFFF",
          ghost: "#F7F8FC",
          ghostHover: "#EEF0FF",
          ghostText: "#4B5563"
        },
        accent: {
          DEFAULT: "#6CC48D",
          blue: "#A8B3F4",
          blueDark: "#6D7BEF",
          blueLight: "#EEF0FF",
          green: "#6CC48D",
          greenDark: "#5DBD82",
          greenLight: "#CBEEDD",
          amber: "#FFE4A8",
          amberDark: "#E6B85C",
          amberLight: "#FFF8E6",
          coral: "#EB6A67",
          coralDark: "#D45552",
          coralLight: "#FDF2F2",
          slate: "#8A8D99",
          slateDark: "#6B7080",
          slateLight: "#F0F1F5",
          rose: "#F7D9DE",
          roseDark: "#EB6A67",
          roseLight: "#FDF2F4"
        },
        text: {
          primary: "#111318",
          secondary: "#4B5563",
          muted: "#8A8D99",
          placeholder: "#9CA0AD"
        },
        border: {
          subtle: "rgba(228, 230, 238, 0.60)",
          default: "#E4E6EE",
          strong: "#D1D4DB"
        },
        event: {
          task: "#F7D9DE",
          taskLight: "#FDF2F4",
          taskText: "#111318",
          taskBorder: "#F0C0C8",
          focus: "#BDE6D1",
          focusLight: "#EDFAF3",
          focusText: "#111318",
          focusBorder: "#9DD8B8",
          habit: "#FFE4A8",
          habitLight: "#FFFBF0",
          habitText: "#111318",
          habitBorder: "#FFD070",
          meeting: "#A8B3F4",
          meetingLight: "#EEF0FF",
          meetingText: "#111318",
          meetingBorder: "#6D7BEF",
          break: "#EB6A67",
          breakLight: "#FDF2F2",
          breakText: "#FFFFFF",
          breakBorder: "#D45552",
          complete: "#CBEEDD",
          completeLight: "#F0FAF5",
          completeText: "#111318",
          completeBorder: "#9DD8B8"
        }
      },
      boxShadow: {
        card: "0 1px 3px rgba(17, 19, 24, 0.04), 0 1px 2px rgba(17, 19, 24, 0.02)",
        hover: "0 4px 12px rgba(17, 19, 24, 0.08), 0 2px 4px rgba(17, 19, 24, 0.04)",
        modal: "0 20px 50px rgba(17, 19, 24, 0.15), 0 8px 20px rgba(17, 19, 24, 0.08)",
        panel: "0 2px 8px rgba(17, 19, 24, 0.06)",
        focus: "0 0 0 2px rgba(88, 101, 242, 0.30)"
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
        button: "8px",
        pill: "999px"
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms"
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)"
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
