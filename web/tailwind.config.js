/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		// Slate + Indigo theme (cool dark backgrounds, indigo accent)
  		colors: {
  			// Background Layers (slate)
  			bg: {
  				primary: '#0f172a',
  				secondary: '#1e293b',
  				elevated: '#334155',
  				surface: '#1e293b',
  			},
  			
  			// Card System
  			card: {
  				DEFAULT: '#1e293b',
  				elevated: '#334155',
  			},
  			
  			// Indigo accent
  			accent: {
  				primary: '#6366f1',
  				soft: '#818cf8',
  				dark: '#4f46e5',
  			},
  			
  			// Border System
  			border: {
  				subtle: 'rgba(255, 255, 255, 0.06)',
  				DEFAULT: 'rgba(255, 255, 255, 0.1)',
  				strong: 'rgba(255, 255, 255, 0.15)',
  			},
  			
  			divider: '#334155',
  			
  			// Text Hierarchy
  			text: {
  				primary: '#f8fafc',
  				secondary: 'rgba(248, 250, 252, 0.85)',
  				muted: 'rgba(248, 250, 252, 0.5)',
  			},
  			
  			// Status Colors
  			success: '#22c55e',
  			error: '#ef4444',
  			warning: '#f59e0b',
  			
  			// Backward compatibility
  			'brand-primary': '#6366f1',
  			'matrix-green': '#00ff41',
  			'solana-purple': '#9945ff',
  		},
  		
  		// ✍️ Typography
  		fontFamily: {
  			display: ['var(--font-display)', 'Orbitron', 'sans-serif'],
  			sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  			mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace']
  		},
  		
  		fontSize: {
  			hero: ['64px', { lineHeight: '1.1', fontWeight: '700' }],
  			'hero-mobile': ['40px', { lineHeight: '1.1', fontWeight: '700' }],
  			section: ['44px', { lineHeight: '1.2', fontWeight: '600' }],
  			subheading: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
  			body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
  			caption: ['14px', { lineHeight: '1.5', fontWeight: '500' }],
  		},
  		
  		// 📐 Spacing System (4px base grid)
  		spacing: {
  			'1': '4px',
  			'2': '8px',
  			'3': '12px',
  			'4': '16px',
  			'6': '24px',
  			'8': '32px',
  			'12': '48px',
  			'16': '64px',
  			'24': '96px',
  			'32': '128px',
  		},
  		
  		// 📦 Container
  		maxWidth: {
  			container: '1320px',
  		},
  		
  		// 🔲 Border Radius (Colosseum Style)
  		borderRadius: {
  			'card': '16px',
  			'xl': '16px',
  			'pill': '9999px',
  			'button': '9999px',
  		},
  		
  		// ✨ Shadows (indigo tint)
  		boxShadow: {
  			glow: '0 20px 60px rgba(0, 0, 0, 0.4)',
  			'glow-gold': '0 20px 60px rgba(99, 102, 241, 0.35)',
  			'card-hover': '0 8px 32px rgba(0, 0, 0, 0.35)',
  		},
  		
  		// 🎭 Animations
  		keyframes: {
  			glitch: {
  				'0%': { 'clip-path': 'inset(20% 0 50% 0)' },
  				'5%': { 'clip-path': 'inset(10% 0 60% 0)' },
  				'10%': { 'clip-path': 'inset(15% 0 55% 0)' },
  				'15%': { 'clip-path': 'inset(25% 0 35% 0)' },
  				'20%': { 'clip-path': 'inset(30% 0 40% 0)' },
  				'25%': { 'clip-path': 'inset(40% 0 20% 0)' },
  				'30%': { 'clip-path': 'inset(10% 0 60% 0)' },
  				'35%': { 'clip-path': 'inset(15% 0 55% 0)' },
  				'40%': { 'clip-path': 'inset(25% 0 35% 0)' },
  				'45%': { 'clip-path': 'inset(30% 0 40% 0)' },
  				'50%': { 'clip-path': 'inset(20% 0 50% 0)' },
  				'55%': { 'clip-path': 'inset(10% 0 60% 0)' },
  				'60%': { 'clip-path': 'inset(15% 0 55% 0)' },
  				'65%': { 'clip-path': 'inset(25% 0 35% 0)' },
  				'70%': { 'clip-path': 'inset(30% 0 40% 0)' },
  				'75%': { 'clip-path': 'inset(40% 0 20% 0)' },
  				'80%': { 'clip-path': 'inset(20% 0 50% 0)' },
  				'85%': { 'clip-path': 'inset(10% 0 60% 0)' },
  				'90%': { 'clip-path': 'inset(15% 0 55% 0)' },
  				'95%': { 'clip-path': 'inset(25% 0 35% 0)' },
  				'100%': { 'clip-path': 'inset(30% 0 40% 0)' },
  			},
  		},

  		animation: {
  			'glitch-after': 'glitch var(--after-duration) infinite linear alternate-reverse',
  			'glitch-before': 'glitch var(--before-duration) infinite linear alternate-reverse',
  		},

  		transitionDuration: {
  			'250': '250ms',
  		},

  		transitionTimingFunction: {
  			'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
  		},
  		
  		// 🎨 Background Gradients (indigo accent)
  		backgroundImage: {
  			'accent-gradient': 'linear-gradient(135deg, #818cf8, #6366f1)',
  			'glow-radial': 'radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25), transparent 60%)',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
