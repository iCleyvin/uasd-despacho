/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#1a3c8f',  // UASD blue
          700: '#152f72',
          800: '#102356',
          900: '#0b173a',
        },
        gold: {
          400: '#e6c55e',
          500: '#c8a951',  // UASD gold
          600: '#a88a3e',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        sans:    ['DM Sans', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
