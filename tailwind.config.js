/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        cl: {
          green: '#5cb85c',
          'green-dark': '#449d44',
          'green-light': '#d4edda',
          navy: '#1a1d2e',
          nav: '#212330',
          'nav-hover': '#2d3045',
          surface: '#f4f5f7',
          border: '#e1e4e8',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
