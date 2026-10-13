/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F2F1EE',
        canvas: '#E4E3DF',
        ink: '#0E1314',
        coral: '#FF5A36',
        coralDeep: '#E2401E',
        honey: '#FFC93C',
        honeyDeep: '#B98700',
        sage: '#D8E6DC',
        sageDeep: '#1F5A3D',
        mint: '#3DDC97',
        muted: '#62696C',
        surface: '#FFFFFF',
        hairline: 'rgba(14,19,20,0.08)',
      },
      fontFamily: {
        grotesk: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 30px 60px -30px rgba(14,19,20,0.35), 0 12px 24px -16px rgba(14,19,20,0.25)',
        soft: '0 10px 30px -12px rgba(14,19,20,0.18)',
        pop: '0 14px 30px -10px rgba(255,90,54,0.55)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.75), inset 0 -1px 0 rgba(255,255,255,0.2), 0 20px 40px -24px rgba(14,19,20,0.35)',
      },
      borderRadius: {
        tile: '14px',
      },
    },
  },
  plugins: [],
};
