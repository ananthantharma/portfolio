// eslint-disable-next-line no-undef
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,css,scss}'],
  theme: {
    extend: {
      // ── Typography tokens ──────────────────────────────────────────────────
      fontFamily: {
        sans: ['Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },

      // ── Color tokens ───────────────────────────────────────────────────────
      colors: {
        yellow: '#efc603',

        // Brand / primary (violet)
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },

        // Neutral surface tokens
        surface: {
          0:   '#ffffff',
          50:  '#f8f8fb',
          100: '#f1f1f6',
          150: '#eaeaef',
          200: '#e2e2e9',
          300: '#d4d4de',
          400: '#b8b8c8',
          500: '#9696a8',
        },

        // Glass-specific token (used w/ opacity modifiers)
        glass: {
          white:  '#ffffff',
          frost:  '#f6f6fb',
          mist:   '#eeeef6',
          smoke:  '#e4e4ee',
        },
      },

      // ── Spacing tokens ─────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
      },

      // ── Border radius tokens ───────────────────────────────────────────────
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },

      // ── Shadow tokens (includes glass shadows) ─────────────────────────────
      boxShadow: {
        // Glassmorphism shadows
        'glass':    '0 4px 24px -4px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.65)',
        'glass-lg': '0 8px 40px -8px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.80)',
        'glass-sm': '0 2px 12px -2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.55)',
        // Glow accents
        'glow-violet': '0 0 40px -8px rgba(139,92,246,0.28)',
        'glow-blue':   '0 0 40px -8px rgba(59,130,246,0.22)',
        'glow-indigo': '0 0 32px -6px rgba(99,102,241,0.25)',
        // Elevation
        'float': '0 12px 48px -12px rgba(0,0,0,0.18), 0 4px 16px -4px rgba(0,0,0,0.08)',
      },

      // ── Backdrop blur tokens ───────────────────────────────────────────────
      backdropBlur: {
        '4xl': '72px',
        '5xl': '96px',
      },

      // ── Animation tokens ───────────────────────────────────────────────────
      keyframes: {
        typing: {
          '0%, 100%': { width: '0%' },
          '30%, 70%': { width: '100%' },
        },
        blink: { '0%': { opacity: 0 } },
        'rotate-loader': {
          '0%':   { transform: 'rotate(0deg)',   strokeDashoffset: '360%' },
          '100%': { transform: 'rotate(360deg)', strokeDashoffset: '-360%' },
        },
        // Skeleton shimmer
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        // Micro-interactions
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        shimmer:     'shimmer 1.6s linear infinite',
        'slide-up':  'slide-up 0.18s ease-out',
        'slide-down':'slide-down 0.18s ease-out',
        'fade-in':   'fade-in 0.15s ease-out',
        'scale-in':  'scale-in 0.15s ease-out',
        'pulse-soft':'pulse-soft 2s ease-in-out infinite',
      },

      screens: {
        touch: { raw: 'only screen and (pointer: coarse)' },
      },
    },
  },
  // eslint-disable-next-line no-undef
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
