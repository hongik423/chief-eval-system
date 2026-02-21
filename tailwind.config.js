/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4A7CFF',
          600: '#3B6BEF',
          700: '#2D5BD9',
          800: '#1E3A8A',
          900: '#1E2A5E',
        },
        surface: {
          0: '#0B0E14',
          50: '#111622',
          100: '#131820',
          200: '#161D28',
          300: '#1A2030',
          400: '#1C2536',
          500: '#243044',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
