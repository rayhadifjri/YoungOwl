import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050b18',
          900: '#0a1428',
          850: '#0d1a33',
          800: '#112142',
          700: '#1a2f57',
          600: '#24406f',
        },
        cyan: { glow: '#22d3ee' },
        electric: '#3b82f6',
        sev: {
          critical: '#f43f5e',
          high: '#fb923c',
          medium: '#facc15',
          low: '#38bdf8',
          info: '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: { glow: '0 0 0 1px rgba(34,211,238,.15), 0 8px 30px -12px rgba(34,211,238,.25)' },
    },
  },
  plugins: [],
} satisfies Config;
