import adapter from '@sveltejs/adapter-static';

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true
	},
	kit: {
		// adapter-static builds a fully static site. `fallback` enables SPA mode:
		// every unknown route is served the fallback page and the client-side router
		// takes over. GitHub Pages serves 404.html for unmatched paths, so we use it.
		adapter: adapter({
			fallback: '404.html'
		}),
		// On GitHub Pages a project site is served from https://<user>.github.io/<repo>,
		// so the app must be built with a base path matching the repo name.
		// In dev we use an empty base path.
		paths: {
			base: dev ? '' : '/chasm-viewer'
		}
	}
};

export default config;
