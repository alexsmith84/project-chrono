import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts,svelte.ts}'],
		// Run tests in parallel for speed (default: true)
		// Each test file runs in isolation
		fileParallelism: true,
		// Isolate environment for each test file
		isolate: true,
		// Global test timeout
		testTimeout: 10000,
		environment: 'jsdom'
	},
	server: {
		port: 5173,
		strictPort: false
	}
});
