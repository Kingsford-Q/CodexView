/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0663cc',
        'primary-dark': '#0552a8',
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-[#0663cc]',
    'hover:bg-[#0552a8]',
    'bg-[#0552a8]',
    'text-[#0663cc]',
    'border-[#0663cc]',
  ],
}
