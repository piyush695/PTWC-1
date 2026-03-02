/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black:    '#03040a',
        deep:     '#070b16',
        surface:  '#0c1120',
        surface2: '#101828',
        neon:     '#00d4ff',
        gold:     '#f0c040',
        border1:  '#182038',
        border2:  '#1e2d50',
        gray1:    '#dce4f0',
        gray2:    '#8898b8',
        gray3:    '#3d4d70',
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        body:    ['Barlow', 'sans-serif'],
        mono:    ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
