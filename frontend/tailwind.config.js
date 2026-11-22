/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#061426', // Primary navy
          900: '#091B31', // Deep navy
          800: '#102846', // Secondary navy
          700: '#1A365D',
        },
        gold: {
          DEFAULT: '#D9A52E', // Primary gold
          highlight: '#F0C45B',
          deep: '#A87519',
        },
        cream: {
          light: '#F8F4EA',
          ivory: '#FFF9ED',
        },
        dark: {
          main: '#101113',
          secondary: '#181A1D',
          card: '#22252A',
          elevated: '#2C3036',
          border: '#383D44',
          gold: '#D5AD5B',
          'gold-hover': '#E4C27A',
          text: '#F1EEE7',
          'text-secondary': '#B8B6B0',
          muted: '#85878B',
        },
        sims: {
          text: '#263347',
          muted: '#687386',
          border: '#E3D8BE',
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
