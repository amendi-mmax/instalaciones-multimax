import animate from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';

/**
 * Paleta y tipografías tomadas literalmente de las variables CSS de
 * Multimax_Despacho_v1.3.html (ver src/styles/globals.css). La migración
 * completa de utilidades específicas del prototipo (mx-*) ocurre en Fase 3.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: 'var(--ink)',
        ink2: 'var(--ink2)',
        surf: 'var(--surf)',
        surf2: 'var(--surf2)',
        line: 'var(--line)',
        ice: 'var(--ice)',
        amber: 'var(--amber)',
        red: 'var(--red)',
        green: 'var(--green)',
        violet: 'var(--violet)',
        text: 'var(--text)',
        muted: 'var(--muted)',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
