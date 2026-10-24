/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        panel: '#121215',
        'panel-subtle': '#18181b',
        'border-dim': '#27272a',
        'border-highlight': '#3f3f46',
        accent: {
          cyan: '#38bdf8',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          violet: '#8b5cf6'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
