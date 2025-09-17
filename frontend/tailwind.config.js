/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Orderly brand colors
        primary: {
          50: '#faf9f7',
          100: '#f5f2ee',
          200: '#ebe4dc',
          300: '#ddd2c5',
          400: '#ccb8a6',
          500: '#a47864', // Mocha Mousse
          600: '#936b58',
          700: '#7a5a4a',
          800: '#64493e',
          900: '#523c32',
          950: '#2b1f1a',
        }
      },
      borderRadius: {
        'orderly': '4px', // Brand 4px border radius
      },
      fontFamily: {
        'sans': ['Inter', 'Noto Sans TC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}