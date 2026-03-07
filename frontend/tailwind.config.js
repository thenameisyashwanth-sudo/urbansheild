/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0A0F1E',
        surface: '#0D1520',
        content: '#F5F2EB',
        accent: '#00897B',
        accentLight: '#4DB6AC',
        danger: '#C62828',
        success: '#2E7D32',
        warn: '#F9A825',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
