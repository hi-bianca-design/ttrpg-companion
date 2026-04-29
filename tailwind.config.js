/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        base: '#1e1e2e',
        surface: '#313244',
        overlay: '#45475a',
        muted: '#6c7086',
        text: '#cdd6f4',
        primary: '#cba6f7',
        blue: '#89b4fa',
        green: '#a6e3a1',
        red: '#f38ba8',
        yellow: '#f9e2af',
      },
    },
  },
  plugins: [],
}
