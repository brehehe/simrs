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
          DEFAULT: '#0D9488', // Teal 600
          hover: '#0F766E',   // Teal 700
          subtle: '#CCFBF1',  // Teal 100
          dark: '#115E59',    // Teal 800
        },
        navy: {
          DEFAULT: '#0F172A', // Slate 900
          light: '#1E293B',   // Slate 800
          dark: '#020617',    // Slate 950
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F8FAFC',  // Slate 50
          muted: '#F1F5F9',   // Slate 100
        },
        border: {
          DEFAULT: '#E2E8F0', // Slate 200
          subtle: '#CBD5E1',  // Slate 300
        },
        text: {
          main: '#1E293B',    // Slate 800
          muted: '#64748B',   // Slate 500
          disabled: '#94A3B8' // Slate 400
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'modal': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
