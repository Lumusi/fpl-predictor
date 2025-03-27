/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        'light-background': '#ffffff', // Pure white
        'light-card': '#ffffff',
        'light-text-primary': '#0f172a', // Dark slate blue
        'light-text-secondary': '#334155', // Slate 700
        'light-accent-primary': '#3b82f6', // blue-500
        'light-accent-secondary': '#93c5fd', // blue-300
        
        // Dark mode colors
        'dark-background': '#0a0a0a', // Near black
        'dark-card': '#171717', // Gray 900
        'dark-text-primary': '#f8fafc', // Slate 50
        'dark-text-secondary': '#cbd5e1', // Slate 300
        'dark-accent-primary': '#3b82f6', // blue-500
        'dark-accent-secondary': '#60a5fa', // blue-400
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
} 