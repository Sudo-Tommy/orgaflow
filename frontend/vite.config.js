import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';
import { devAgentPlugin } from './vite-plugin-dev-agent.js';

const handleProxyError = (proxy) => {
	proxy.on('error', (err, req, res) => {
		if (res && !res.headersSent && typeof res.writeHead === 'function') {
			try {
				res.writeHead(502, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Proxy temporär nicht verfügbar' }));
			} catch {}
		}
	});
	proxy.on('proxyReqWsError', (err, req, socket) => {
		try { socket.destroy(); } catch {}
	});
};

export default defineConfig({
	plugins: [
		devAgentPlugin(),
		enhancedImages(),
		tailwindcss(),
		sveltekit()
	],

	server: {
		port: 5173,
		host: true,
		strictPort: false,
		hmr: {
			clientPort: 5173
		},
		watch: {
			ignored: ['**/pb_public/**', '**/backend/**']
		},
		proxy: {
			'/api/collections': {
				target: 'http://127.0.0.1:8090',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/files': {
				target: 'http://127.0.0.1:8090',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/realtime': {
				target: 'http://127.0.0.1:8090',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/orgaflow': {
				target: 'http://127.0.0.1:8090',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/health': {
				target: 'http://127.0.0.1:8090',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/emails': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/onboarding': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/ai': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/google-calendar': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/api/google-drive': {
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				configure: handleProxyError
			},
			'/_': {
				target: 'http://127.0.0.1:8090',
				changeOrigin: true,
				configure: handleProxyError
			}
		}
	},

	legacy: {
		skipWebSocketTokenCheck: true
	},

	build: {
		chunkSizeWarningLimit: 1500
	},

	resolve: {
		alias: {
			html2canvas: 'html2canvas-pro'
		}
	},

	define: {
		global: 'window'
	}
});
