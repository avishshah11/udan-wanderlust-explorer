import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Same tokens as the public site (web/tailwind.config.ts) so the account and
// desk feel like the same business.
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        udan: {
          orange: "#FF8551",
          // Darker than the website's blue and gray so links and secondary
          // text pass WCAG AA contrast on white and light gray.
          blue: "#2E5BD8",
          charcoal: "#2D2D2D",
          gray: "#595959",
          lightGray: "#F5F5F5",
        },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: { sans: ["var(--font-inter)", "Inter", "sans-serif"] },
      // The smallest text is never below about 16px (with the 18px base).
      fontSize: { xs: ["0.875rem", { lineHeight: "1.4rem" }] },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
