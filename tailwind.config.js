/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        salon: {
          50: '#fbf8f3',
          100: '#f5efe4',
          200: '#ebdcc5',
          300: '#dec29f',
          400: '#cca173',
          500: '#be8753',
          600: '#b07244',
          700: '#925a38',
          800: '#774932',
          900: '#613c2c',
          950: '#341e15',
        },
        gold: {
          400: '#fbbf24',
          500: '#d4af37',
          600: '#b39023'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
