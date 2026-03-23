import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        butterflyPurple: "#5B2C83",
        butterflyGold: "#C9A227",
        attic: {
          50: "#fdf8f0",
          100: "#f9ecdb",
          200: "#f2d5b0",
          300: "#e9b87c",
          400: "#de9548",
          500: "#d47a2e",
          600: "#c46224",
          700: "#a34a1f",
          800: "#843c20",
          900: "#6c321d",
          950: "#3a180d",
        },
      }
    },
  },
  plugins: [],
};
export default config;
