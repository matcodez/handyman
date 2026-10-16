import type { Config } from 'tailwindcss'

// Sistema visual Handyman — heredado de WPOS (navy + azul) con un acento cálido.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-ibm)', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        num: ['var(--font-outfit)', 'system-ui', 'sans-serif'],
      },
      colors: {
        paper: '#f5f6fa',
        paper2: '#eceef5',
        ink: '#0b1020',
        ink2: '#434c63',
        ink3: '#6b7489',
        line: '#e1e5ee',
        line2: '#cbd2e0',
        navy: { DEFAULT: '#0b1020', 2: '#10182b', 3: '#161f35', 4: '#253252' },
        brand: { DEFAULT: '#3154c8', dark: '#2644a6', light: '#5b7be0', bg: '#edf1fd' },
        accent: { DEFAULT: '#f5a524', dark: '#b86e00', bg: '#fff4dc' },
        ok: { DEFAULT: '#12733f', bg: '#e6f5ec' },
        warn: { DEFAULT: '#8f5a00', bg: '#fff3d6' },
        bad: { DEFAULT: '#b3261e', bg: '#fdebe9' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,16,32,0.05), 0 0 0 1px #e1e5ee',
        lift: '0 12px 32px -12px rgba(11,16,32,0.22), 0 0 0 1px #e1e5ee',
        float: '0 24px 60px -20px rgba(11,16,32,0.45)',
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
      keyframes: {
        'in-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: { 'in-up': 'in-up 0.3s ease-out both', float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
}
export default config
