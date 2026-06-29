import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'float-lg': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-25px) rotate(2deg)' },
        },
        fly: {
          '0%': { transform: 'translateX(-10%) translateY(0)' },
          '50%': { transform: 'translateX(50%) translateY(-20px)' },
          '100%': { transform: 'translateX(110%) translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'move-dash': {
          to: { strokeDashoffset: '-40' },
        },
        'travel-particle': {
          '0%': { transform: 'translateY(0) translateX(0) scale(0)', opacity: '0' },
          '10%': { opacity: '1', transform: 'scale(1)' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(-120px) translateX(30px) scale(0)', opacity: '0' },
        },
        'travel-particle-2': {
          '0%': { transform: 'translateY(0) translateX(0) scale(0)', opacity: '0' },
          '10%': { opacity: '0.8', transform: 'scale(1)' },
          '90%': { opacity: '0.8' },
          '100%': { transform: 'translateY(-100px) translateX(-20px) scale(0)', opacity: '0' },
        },
        'ring-pulse': {
          '0%': { boxShadow: '0 0 0 0 rgba(38, 166, 154, 0.4)' },
          '70%': { boxShadow: '0 0 0 20px rgba(38, 166, 154, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(38, 166, 154, 0)' },
        },
        'fly-across': {
          '0%': { transform: 'translateX(-120px) translateY(0) rotate(-5deg)' },
          '25%': { transform: 'translateX(25vw) translateY(-30px) rotate(3deg)' },
          '50%': { transform: 'translateX(50vw) translateY(0) rotate(-2deg)' },
          '75%': { transform: 'translateX(75vw) translateY(-20px) rotate(4deg)' },
          '100%': { transform: 'translateX(calc(100vw + 120px)) translateY(0) rotate(-5deg)' },
        },
        'fly-across-2': {
          '0%': { transform: 'translateX(calc(100vw + 100px)) translateY(0) rotate(5deg)' },
          '25%': { transform: 'translateX(75vw) translateY(-20px) rotate(-3deg)' },
          '50%': { transform: 'translateX(50vw) translateY(0) rotate(2deg)' },
          '75%': { transform: 'translateX(25vw) translateY(-15px) rotate(-4deg)' },
          '100%': { transform: 'translateX(-120px) translateY(0) rotate(5deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        float: 'float 6s ease-in-out infinite',
        'float-lg': 'float-lg 8s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-slow': 'float 8s ease-in-out 1s infinite',
        fly: 'fly 20s linear infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        shimmer: 'shimmer 6s ease-in-out infinite',
        'move-dash': 'move-dash 1s linear infinite',
        'travel-particle': 'travel-particle 4s ease-out infinite',
        'travel-particle-2': 'travel-particle-2 5s ease-out infinite',
        'ring-pulse': 'ring-pulse 2s ease-out infinite',
        'fly-across': 'fly-across 18s linear infinite',
        'fly-across-2': 'fly-across-2 22s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
