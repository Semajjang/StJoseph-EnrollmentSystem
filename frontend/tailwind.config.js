/** @type {import('tailwindcss').Config} */
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: withAlpha('--brand'),
          mid: withAlpha('--brand-mid'),
          strong: withAlpha('--brand-strong'),
          deep: withAlpha('--brand-deep'),
          soft: withAlpha('--brand-soft'),
          tint: withAlpha('--brand-tint'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          strong: withAlpha('--accent-strong'),
          soft: withAlpha('--accent-soft'),
          tint: withAlpha('--accent-tint'),
        },
        ink: {
          DEFAULT: withAlpha('--ink'),
          soft: withAlpha('--ink-soft'),
        },
        muted: withAlpha('--muted'),
        faint: withAlpha('--faint'),
        canvas: withAlpha('--canvas'),
        surface: {
          DEFAULT: withAlpha('--surface'),
          sunk: withAlpha('--surface-sunk'),
        },
        line: {
          DEFAULT: withAlpha('--line'),
          strong: withAlpha('--line-strong'),
        },
        success: {
          DEFAULT: withAlpha('--success'),
          soft: withAlpha('--success-soft'),
        },
        warning: {
          DEFAULT: withAlpha('--warning'),
          soft: withAlpha('--warning-soft'),
        },
        danger: {
          DEFAULT: withAlpha('--danger'),
          soft: withAlpha('--danger-soft'),
        },
        info: {
          DEFAULT: withAlpha('--info'),
          soft: withAlpha('--info-soft'),
        },
        focus: withAlpha('--focus'),
        // Program age-band identity chips
        program: {
          ited: '#EF7C63',
          prek1: '#2FA8A0',
          prek2: '#E1A13A',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Bricolage Grotesque', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        focus: '0 0 0 3px rgb(var(--focus) / 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.4s infinite',
      },
    },
  },
  plugins: [],
};
