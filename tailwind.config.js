/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bitcoin: {
          light: '#FDB614',
          DEFAULT: '#F7931A',
          dark: '#F57F1C'
        }
      }
    },
  },
  plugins: [],
}