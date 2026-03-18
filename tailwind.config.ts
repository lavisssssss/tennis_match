import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', "sans-serif"],
      },
      fontSize: {
        /** 14px — labels, nav, captions */
        sm: ["0.875rem", { lineHeight: "1.45", letterSpacing: "-0.01em" }],
        /** 16px — body */
        base: ["1rem", { lineHeight: "1.6", letterSpacing: "-0.01em" }],
        /** 20px — section titles */
        xl: ["1.25rem", { lineHeight: "1.35", letterSpacing: "-0.02em" }],
        /** 24px — page / hero titles */
        "2xl": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
    },
  },
  plugins: [],
};

export default config;


