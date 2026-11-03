/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Manrope', 'sans-serif'],
      },
      colors: {
        primary: '#14243D',
        ink: '#1E293B',
        muted: '#64748B',
        brand: '#2563EB',
        canvas: '#F8FAFC',
        success: '#16A34A',
        error: '#DC2626',
      },
      boxShadow: {
        card: '0 8px 24px rgba(20, 36, 61, 0.06)',
      },
    },
  },
  plugins: [],
};
