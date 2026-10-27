import { realpath, stat } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import type { Project } from "./schemas";
import { isLocalScreenshot, screenshotUrl } from "./screenshots";

export interface ScreenshotAsset {
	path: string;
	url: string;
	contentType: string;
}

const contentTypes: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	avif: "image/avif",
};

export async function projectScreenshotAssets(
	project: Project,
	yamlPath: string,
): Promise<ScreenshotAsset[]> {
	if (!project.screenshots?.some((image) => isLocalScreenshot(image.src)))
		return [];

	const directory = await realpath(dirname(yamlPath));
	const assets: ScreenshotAsset[] = [];

	for (const [index, screenshot] of (project.screenshots ?? []).entries()) {
		if (!isLocalScreenshot(screenshot.src)) continue;

		const expected = resolve(directory, screenshot.src);
		const path = await realpath(expected);

		if (path !== expected || !path.startsWith(`${directory}${sep}`)) {
			throw new Error(`Screenshot must not traverse symlinks: ${yamlPath}`);
		}

		const file = await stat(path);

		if (!file.isFile() || file.size > 10 * 1024 * 1024) {
			throw new Error(`Screenshot must be a file of at most 10 MiB: ${path}`);
		}

		const extension = screenshot.src.split(".").at(-1)?.toLowerCase() ?? "";

		assets.push({
			path,
			url: screenshotUrl(project.slug, screenshot, index),
			contentType: contentTypes[extension],
		});
	}

	return assets;
}
