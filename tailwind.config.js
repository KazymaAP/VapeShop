/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bgDark: '#0a0a0f',
        cardBg: '#111115',
        border: '#2a2a33',
        neon: '#c084fc',
        neonGlow: 'rgba(192, 132, 252, 0.4)',
        textPrimary: '#ededee',
        textSecondary: '#a1a1aa',
        danger: '#f43f5e',
        success: '#10b981',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 12px rgba(192, 132, 252, 0.4)',
        'neon-lg': '0 0 20px rgba(192, 132, 252, 0.5)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};
