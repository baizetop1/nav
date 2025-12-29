/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-gradient-to-br',
    'from-blue-50',
    'to-indigo-50',
    'dark:from-gray-900',
    'dark:to-gray-800',
    'from-indigo-50',
    'to-purple-50',
    'dark:to-slate-900',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: 'class',
}
