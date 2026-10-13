/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F6F3ED',
        canvas: '#ebe7df',
        ink: '#19272B',
        coral: '#C95F3E',
        coralDeep: '#B64339',
        honey: '#F0C85B',
        honeyDeep: '#D9A736',
        sage: '#E4EDE5',
        sageDeep: '#294038',
        muted: '#687478',
        surface: '#FFFDF8',
        hairline: '#E6E1D6',
      },
      fontFamily: {
        serif: ['Spectral', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 20px 60px -20px rgba(25, 39, 43, 0.25), 0 8px 20px -12px rgba(25, 39, 43, 0.18)',
        soft: '0 8px 30px rgba(25, 39, 43, 0.08)',
        pop: '0 10px 40px -8px rgba(201, 95, 62, 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
