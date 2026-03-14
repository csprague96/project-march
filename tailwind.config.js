/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-card)',
          line: 'var(--border)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
        },
        triage: {
          immediate: 'var(--triage-immediate)',
          delayed: 'var(--triage-delayed)',
          minimal: 'var(--triage-minimal)',
          expectant: 'var(--triage-expectant)',
        },
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', 'sans-serif'],
        medical: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 40px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
