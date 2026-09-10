/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cairo"', 'system-ui', 'sans-serif'],
      },
      colors: {
        board: {
          bg: '#0F1420',
          tile: '#171E2E',
          line: '#2A3348',
        },
      },
      screens: {
        xs: '380px',
      },
    },
  },
  plugins: [],
};
