/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#CC0000',
          dark: '#1a1a1a',
          gray: '#f5f5f5',
        }
      }
    },
  },
  plugins: [],
}

