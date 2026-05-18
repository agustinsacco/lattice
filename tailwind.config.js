/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: "1rem",
        screens: {
          "2xl": "1200px", // Custom max-width for the container
        },
      },
      colors: {
        brand: {
          primary: "#fbbf24",
          secondary: "#d97706",
          dark: "#09090b",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        heading: ["var(--font-heading)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-out forwards",
        pulse: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "press-down": "pressDown 0.1s ease-out forwards",
        "press-up": "pressUp 0.1s ease-out forwards",
      },
      keyframes: {
        pressDown: {
          "0%": { transform: "scale(1)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
          "100%": { transform: "scale(0.98)", boxShadow: "0 2px 4px rgba(0,0,0,0.15)" },
        },
        pressUp: {
          "0%": { transform: "scale(0.98)", boxShadow: "0 2px 4px rgba(0,0,0,0.15)" },
          "100%": { transform: "scale(1)", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" },
        },
      },
      transitionProperty: {
        height: "height",
        spacing: "margin, padding",
        transform: "transform",
        all: "all",
      },
    },
  },
  plugins: [],
};
