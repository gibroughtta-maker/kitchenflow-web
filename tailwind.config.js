import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        'primary-alt': '#007bff',
        'asda-green': '#78BE20',
        'tesco-blue': '#00539F',
        'lidl-blue': '#0050AA',
        'lidl-red': '#E3000F',
        'lidl-yellow': '#FFD500',
        'background-light': '#f2f4f6',
        'background-dark': '#0f1923',
        'notion-bg': '#ffffff',
        'notion-border': '#efefef',
        'notion-text-main': '#37352f',
        'notion-text-sub': '#787774',
        'glass-light': 'rgba(255, 255, 255, 0.65)',
        'glass-dark': 'rgba(0, 0, 0, 0.55)',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
        full: '9999px',
        droplet: '2rem',
      },
      boxShadow: {
        'glass-card': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-glow': 'inset 0 0 20px rgba(255, 255, 255, 0.3)',
        'icon-glow-green': '0 0 15px rgba(34, 197, 94, 0.6)',
        'icon-glow-red': '0 0 15px rgba(239, 68, 68, 0.6)',
        'icon-glow-yellow': '0 0 15px rgba(234, 179, 8, 0.6)',
        'modal-glow': '0 0 40px rgba(255, 255, 255, 0.2)',
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glass-inset': 'inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        glow: '0 0 20px rgba(255, 87, 34, 0.3)',
        liquid:
          '0 20px 40px -5px rgba(0, 0, 0, 0.1), inset 0 1px 2px 0 rgba(255, 255, 255, 0.6)',
        'liquid-neo':
          'inset 2px 2px 5px rgba(255, 255, 255, 0.9), inset -2px -2px 5px rgba(0, 0, 0, 0.05), 4px 4px 10px rgba(0, 0, 0, 0.05)',
        'liquid-neo-hover':
          'inset 3px 3px 6px rgba(255, 255, 255, 1), inset -3px -3px 6px rgba(0, 0, 0, 0.03), 6px 6px 12px rgba(0, 0, 0, 0.08)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #eef2ff 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '80px',
        '5xl': '100px',
      },
      animation: {
        'slide-in': 'slideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'scan-y': 'scan 3s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
      },
      transitionTimingFunction: {
        'drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
