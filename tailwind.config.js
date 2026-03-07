/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#060B17', // app background
        shell: '#080D1A', // header/sidebar
        card: '#0F1629', // primary card
        cardDeep: '#0A0F1E',
        borderSoft: '#1F2937',
        borderStrong: '#111827',
        textPrimary: '#E5E7EB',
        textSecondary: '#9CA3AF',
        accent: '#14B8A6',
        accentSoft: '#0F766E',
        danger: '#F97316',
        dangerStrong: '#EF4444',
        success: '#22C55E',
      },
      fontFamily: {
        mono: ['Space Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
