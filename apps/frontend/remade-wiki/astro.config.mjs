import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import launcherIntegration from "./src/integrations/launcher.ts";
export default defineConfig({
	site: "https://remade.wiki",
	output: "static",
	redirects: {
		"/projects/pounce": {
			destination: "/projects/filecraft/",
			status: 302,
		},
		"/authors/bherbruck": {
			destination: "/authors/tangency-labs/",
			status: 302,
		},
		"/projects/animationcraft": {
			destination: "/projects/flare-animate/",
			status: 302,
		},
		"/projects/solvecraft": {
			destination: "/projects/solidcraft/",
			status: 302,
		},
	},
	integrations: [
		react(),
		launcherIntegration(process.env.REMADE_LAUNCHER_ENABLED),
		sitemap(),
	],
	vite: { plugins: [tailwindcss()] },
});
