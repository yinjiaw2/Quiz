import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { ink: "#17221d", brand: "#2f6e55", mint: "#eaf4ee", cream: "#f7f8f5" } } },
  plugins: []
} satisfies Config;
