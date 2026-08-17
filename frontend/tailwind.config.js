/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a',
          hover: '#1e293b',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
}