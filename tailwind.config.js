/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#a855f7', 
          'light': '#c084fc',
          'dark': '#9333ea',
        },
        'glow': 'rgba(192, 132, 252, 0.15)', 
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        'inner-glow': 'inset 0 0 20px 0px var(--tw-shadow-color)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'rotateBg': 'rotateBg 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        rotateBg: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        }
      },
    },
  },
  plugins: [],
}