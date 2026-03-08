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
        accent: '#00f0ff',
        accentLight: '#4DFFFF',
        danger: '#ff3366',
        success: '#00ff88',
        warn: '#ffaa00',
        cyber: {
          bg: '#0a0e17',
          card: '#12182a',
          border: '#1e2a42',
          neon: '#00f0ff',
          purple: '#8b5cf6',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
