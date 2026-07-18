// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        school: {
          navy: '#0f172a',    // The dark navy sidebar background
          yellow: '#facc15',  // The yellow accent and logo text
          gray: '#f8fafc',    // The light background for the main content area
        }
      }
    },
  },
  plugins: [],
}