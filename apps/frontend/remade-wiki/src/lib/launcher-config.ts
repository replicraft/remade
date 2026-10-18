import * as v from "valibot";
import { launcherSchema, parseYaml } from "./schemas";

export function parseLauncher(source: string, projectSlugs: readonly string[]) {
	try {
		const launcher = v.parse(launcherSchema, parseYaml(source));
		const known = new Set(projectSlugs);

		for (const slug of launcher.projects) {
			if (!known.has(slug)) {
				throw new Error(
					`Unknown project "${slug}". Use an existing canonical catalog project slug; tools and original software slugs are not eligible.`,
				);
			}
		}

		return launcher;
	} catch (error) {
		throw new Error(
			`launcher.yaml: expected { projects: [canonical-project-slug, ...] }. ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}
