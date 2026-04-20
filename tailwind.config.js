/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        body: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
      colors: {
        rupee: {
          void: '#0A0A0F',
          ink: '#111118',
          surface: '#16161F',
          card: '#1C1C28',
          border: '#2A2A3A',
          muted: '#3A3A50',
          amber: '#F5A623',
          'amber-dim': '#C4841C',
          gold: '#FFD166',
          coral: '#FF6B6B',
          mint: '#06D6A0',
          sky: '#4CC9F0',
          text: '#E8E8F0',
          'text-dim': '#9090A8',
        },
      },
      backgroundImage: {
        'rupee-gradient': 'radial-gradient(ellipse at top, #1a1a2e 0%, #0A0A0F 60%)',
        'amber-glow': 'radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 70%)',
        'card-shine': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'card-in': 'cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        cardIn: {
          from: { transform: 'translateY(30px) scale(0.96)', opacity: '0' },
          to: { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
