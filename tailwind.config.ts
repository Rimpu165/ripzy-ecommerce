import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

/**
 * Light-only design system. Palette: warm off-white surfaces + dusty pink primary.
 *  - `indigo` (used for every primary action) is remapped to a soft raspberry-pink scale
 *  - `slate` (neutrals) is remapped to warm stone so greys feel soft, not bluish
 *  - `rose` (errors / discount chips) is remapped to true red so it stays distinct from the pink primary
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          50: "#fdf4f7",
          100: "#fbe8ee",
          200: "#f6d0dd",
          300: "#eeaabf",
          400: "#e27c9b",
          500: "#d35880",
          600: "#bf4268",
          700: "#a03455",
          800: "#832d48",
          900: "#6c2a3f",
          950: "#3b1220",
        },
        slate: colors.stone,
        rose: colors.red,
        ink: "#1f2937",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(16, 24, 40, 0.04), 0 1px 3px 0 rgba(16, 24, 40, 0.06)",
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px -2px rgba(16, 24, 40, 0.06)",
        pop: "0 12px 32px -8px rgba(16, 24, 40, 0.14)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
