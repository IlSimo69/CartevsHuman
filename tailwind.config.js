/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        card: {
          black: '#1a1a1a',
          white: '#f5f5f0',
        },
      },
      fontFamily: {
        card: ['"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
