import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";

// Only an explicit build environment value enables the page, including in dev.
export function launcherPageEnabled(value: string | undefined): boolean {
	return value === "true";
}

export default function launcherIntegration(
	value: string | undefined,
): AstroIntegration {
	const enabled = launcherPageEnabled(value);

	return {
		name: "remade-launcher",
		hooks: {
			"astro:config:setup": ({ injectRoute, updateConfig }) => {
				updateConfig({
					vite: {
						define: {
							"import.meta.env.REMADE_LAUNCHER_ENABLED":
								JSON.stringify(enabled),
						},
					},
				});

				if (enabled) {
					injectRoute({
						pattern: "/launcher",
						entrypoint: fileURLToPath(
							new URL("../routes/launcher.astro", import.meta.url),
						),
						prerender: true,
					});
				}
			},
		},
	};
}
