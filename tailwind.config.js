/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Keeping this but we won't use it, or we can just remove it
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '0.125rem',
        DEFAULT: '0.125rem',
        'md': '0.125rem',
        'lg': '0.125rem',
        'xl': '0.125rem',
        '2xl': '0.125rem',
        '3xl': '0.125rem',
        'full': '9999px',
      }
    },
  },
  plugins: [],
}
