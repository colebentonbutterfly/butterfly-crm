import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        butterflyPurple: "#5B2C83",
        butterflyGold: "#C9A227",
      }
    },
  },
  plugins: [],
};
export default config;
