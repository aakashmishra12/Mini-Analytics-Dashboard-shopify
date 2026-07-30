/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Vercel-style neutral surfaces
        surface: {
          page: 'var(--surface-page)',
          'page-blur': 'var(--surface-page-blur)',
          card: 'var(--surface-card)',
          subtle: 'var(--surface-subtle)',
          hover: 'var(--surface-hover)',
        },
        ink: {
          primary: 'var(--text-primary)',
          'primary-hover': 'var(--text-primary-hover)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        hairline: 'var(--border-hairline)',
        'hairline-strong': 'var(--border-strong)',
        // Validated chart + status tokens (see dataviz palette)
        series: 'var(--series-1)',
        status: {
          critical: '#d03b3b',
          warning: '#fab219',
          good: '#0ca30c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
