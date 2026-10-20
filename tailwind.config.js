/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"], // enables `dark:` variant via adding class="dark" on <html> or <body>
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        // Track colour of an unchecked <Switch>; without it the track is
        // transparent and an "off" switch is invisible on a white background.
        "switch-background": "var(--switch-background)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },

        // Optional extras your tokens define:
        success: { DEFAULT: "var(--success)", foreground: "var(--success-foreground)" },
        warning: { DEFAULT: "var(--warning)", foreground: "var(--warning-foreground)" },
        info:    { DEFAULT: "var(--info)",    foreground: "var(--info-foreground)" },

        // Sidebar & charts (only if you will use classes like bg-sidebar, text-chart-1, etc.)
        sidebar: { DEFAULT: "var(--sidebar)", foreground: "var(--sidebar-foreground)" },
        "sidebar-primary": { DEFAULT: "var(--sidebar-primary)", foreground: "var(--sidebar-primary-foreground)" },
        "sidebar-accent":  { DEFAULT: "var(--sidebar-accent)",  foreground: "var(--sidebar-accent-foreground)" },
        "sidebar-border": "var(--sidebar-border)",
        "sidebar-ring":   "var(--sidebar-ring)",

        "table-header": "var(--table-header)",
        "table-header-foreground": "var(--table-header-foreground)",

        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
