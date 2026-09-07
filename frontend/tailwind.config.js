/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5D7E90',
          deep: '#3F5A6B',
          tint: '#EEF3F5',
        },
        sidebar: '#4F6B7F',
        ink: '#33404A',
        'ink-soft': '#77848D',
        good: {
          DEFAULT: '#7C9C82',
          deep: '#5D7C63',
        },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible"', 'system-ui', 'sans-serif'],
        display: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
