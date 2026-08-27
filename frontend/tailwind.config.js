/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#003660',
          800: '#004080',
          700: '#004a99',
          600: '#0055b3',
        },
        lime: {
          DEFAULT: '#BFD122',
          500: '#BFD122',
          400: '#cfe04a',
          300: '#dfe97a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
