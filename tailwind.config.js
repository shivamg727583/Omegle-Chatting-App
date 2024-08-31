/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {
      colors: {
        'gray-700': '#2d2f36',
        'gray-800': '#1f2024',
        'gray-900': '#17181c',
      },
    },
  },
  plugins: [],
}

