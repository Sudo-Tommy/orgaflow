import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite'; // <-- NEU: Tailwind v4 Plugin
import { enhancedImages } from '@sveltejs/enhanced-img';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		enhancedImages(), // <-- WICHTIG: Muss vor sveltekit() stehen!
		tailwindcss(), // <-- WICHTIG: Tailwind-Plugin aktivieren
		sveltekit()],

	build: {
		chunkSizeWarningLimit: 1500 // Erhöht das Warn-Limit auf 1.5 MB
	},

	define: {
		global: 'window' // <-- Unser Fix für PDFKit
	}
	
});