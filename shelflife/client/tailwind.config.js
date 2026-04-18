/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0F',
        surface: '#0F0F1A',
        vibe: {
          HighSignal: '#00FF9C',
          Educational: '#4FC3F7',
          Chaotic: '#FF6B35',
          Cursed: '#9C27B0',
          Aesthetic: '#FF80AB',
          Liminal: '#B0BEC5'
        }
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 3s infinite',
        'floatUp': 'floatUp 2s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
          '25%, 75%': { opacity: 0.8 }
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: 1 },
          '100%': { transform: 'translateY(-50px)', opacity: 0 }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    },
  },
  plugins: [],
}
