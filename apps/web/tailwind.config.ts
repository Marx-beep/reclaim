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
          bg: "#FAF8F6",
          subtle: "#F5F1EE"
        },
        surface: {
          base: "#FFFFFF",
          raised: "#FDFCFB",
          overlay: "rgba(255, 255, 255, 0.98)"
        },
        brand: {
          DEFAULT: "#E8B89A",
          light: "#F2CFBB",
          lighter: "#FDF5F1",
          dark: "#D4846A",
          muted: "#C9A08A"
        },
        btn: {
          primary: "#E8B89A",
          primaryHover: "#D4846A",
          primaryLight: "#FDF5F1",
          primaryText: "#8B5A42",
          solid: "#9DB4C0",
          solidHover: "#7A9AAD",
          solidLight: "#EDF4F7",
          solidText: "#4A6670",
          ghost: "#F5F1EE",
          ghostHover: "#EDE6E1",
          ghostText: "#6B5D55"
        },
        accent: {
          DEFAULT: "#C5D4A3",
          blue: "#ABD7FB",
          blueDark: "#8BBEE5",
          blueLight: "#E8F4FD",
          green: "#D2E0AA",
          greenDark: "#B8C98F",
          greenLight: "#F3F7E8",
          amber: "#FCCEB4",
          amberDark: "#E5A888",
          amberLight: "#FDF2ED",
          coral: "#F98C53",
          coralDark: "#E07030",
          coralLight: "#FEF0E8",
          slate: "#B8C4CE",
          slateDark: "#8EA6B2",
          slateLight: "#EDF3F7",
          rose: "#E8C0B8",
          roseDark: "#D4948A",
          roseLight: "#FBF2F0"
        },
        text: {
          primary: "#3D3D3D",
          secondary: "#6B6560",
          muted: "#9D9590",
          placeholder: "#C4BEB8"
        },
        border: {
          subtle: "rgba(180, 170, 162, 0.12)",
          default: "rgba(180, 170, 162, 0.22)",
          strong: "rgba(150, 140, 132, 0.32)"
        },
        event: {
          task: "#ABD7FB",
          taskLight: "#EEF6FD",
          taskText: "#5A7A9A",
          taskBorder: "#C5DEF5",
          focus: "#D2E0AA",
          focusLight: "#F2F6E8",
          focusText: "#5A7050",
          focusBorder: "#C8DCA0",
          habit: "#D2E0AA",
          habitLight: "#F2F6E8",
          habitText: "#5A7050",
          habitBorder: "#C8DCA0",
          meeting: "#FCCEB4",
          meetingLight: "#FDF5F1",
          meetingText: "#8B6050",
          meetingBorder: "#F0CAB4",
          break: "#E8E4E0",
          breakLight: "#F5F3F1",
          breakText: "#7A7570",
          breakBorder: "#DDD8D2",
          complete: "#C5D4A3",
          completeLight: "#F3F7E8",
          completeText: "#5A6A48",
          completeBorder: "#C8DCA0"
        }
      },
      boxShadow: {
        card: "0 2px 8px rgba(100, 90, 82, 0.06), 0 1px 2px rgba(100, 90, 82, 0.04)",
        hover: "0 8px 24px rgba(100, 90, 82, 0.10), 0 2px 6px rgba(100, 90, 82, 0.06)",
        modal: "0 20px 60px rgba(100, 90, 82, 0.14), 0 8px 20px rgba(100, 90, 82, 0.08)",
        panel: "0 4px 16px rgba(100, 90, 82, 0.08)",
        focus: "0 0 0 2px rgba(171, 215, 251, 0.45)"
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
