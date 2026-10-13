import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        accent: "rgb(255, 223, 0)",
        "accent-dim": "rgba(255,223,0,0.4)",
        // Emotion palette
        emotion: {
          hype:       "rgb(236,72,153)",
          sad:        "rgb(56,189,248)",
          aggressive: "rgb(239,68,68)",
          soft:       "rgb(168,85,247)",
          playful:    "rgb(250,204,21)",
          longing:    "rgb(129,140,248)",
          empowering: "rgb(52,211,153)",
          neutral:    "rgba(255,255,255,0.4)",
        },
      },
      fontFamily: {
        mono:    ["Space Mono", "Courier New", "monospace", ...fontFamily.mono],
        display: ["Space Mono", "Courier New", "monospace"],
        sans:    ["Space Mono", "Courier New", "monospace", ...fontFamily.sans],
      },
      animation: {
        "glow-pulse":    "glowPulse 2s ease-in-out infinite",
        "waveform-beat": "waveformBeat 1.1s ease-in-out infinite",
        "corner-blink":  "cornerBlink 2.5s steps(2) infinite",
        "spin-slow":     "rotate 3s linear infinite",
        "fade-up":       "fadeSlideUp 0.4s ease forwards",
        "scan":          "scanLine 5s linear infinite",
        blink:           "blink 1s steps(2) infinite",
      },
      keyframes: {
        glowPulse: {
          "0%,100%": { opacity: "0.6", boxShadow: "0 0 4px rgb(255,223,0)" },
          "50%":     { opacity: "1",   boxShadow: "0 0 14px rgb(255,223,0)" },
        },
        waveformBeat: {
          "0%,100%": { transform: "scaleY(0.35)", opacity: "0.5" },
          "50%":     { transform: "scaleY(1)",    opacity: "1" },
        },
        cornerBlink: { "50%": { opacity: "0.15" } },
        rotate: {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        fadeSlideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scanLine: {
          "0%":   { top: "0%",   opacity: "0.6" },
          "100%": { top: "100%", opacity: "0"   },
        },
        blink: { "50%": { opacity: "0" } },
      },
      boxShadow: {
        glow:        "0 0 30px rgba(255,223,0,0.25)",
        "glow-sm":   "0 0 12px rgba(255,223,0,0.2)",
        "glow-lg":   "0 0 60px rgba(255,223,0,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
