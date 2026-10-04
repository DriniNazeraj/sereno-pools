/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        forest: { 950: "#0B2019", 900: "#0E2A22", 700: "#1F4D3D", 500: "#3E7A62" },
        cream: { 50: "#FBF9F4", 100: "#F4EFE5" },
        ink: { DEFAULT: "#17201B", muted: "#5B635E" },
        line: "#E3DCCF",
        "on-dark": "#F4EFE5",
        error: "#B3261E",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--foreground))" },
        muted: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "#FBF9F4" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--foreground))" },
        popover: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--foreground))" },
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { sm: "6px", md: "12px", lg: "20px" },
      transitionTimingFunction: { "out-expo": "cubic-bezier(.22,1,.36,1)" },
      boxShadow: {
        card: "0 1px 2px rgba(14,42,34,.04), 0 8px 24px rgba(14,42,34,.06)",
        lift: "0 2px 4px rgba(14,42,34,.06), 0 16px 40px rgba(14,42,34,.10)",
      },
      screens: { sm: "640px", md: "900px", lg: "1200px" },
    },
  },
  plugins: [],
};
