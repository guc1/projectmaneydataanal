import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f1729',
        foreground: '#f9fafc',
        accent: {
          DEFAULT: '#38bdf8',
          foreground: '#021019'
        },
        muted: {
          DEFAULT: '#1f2a3d',
          foreground: '#9ca3af'
        }
      },
      boxShadow: {
        glow: '0 10px 40px rgba(56, 189, 248, 0.25)'
      }
    }
  },
  plugins: []
};

export default config;
