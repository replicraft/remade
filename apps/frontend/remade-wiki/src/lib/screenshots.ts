import type { Screenshot } from "./schemas";

// Local screenshots must stay beside the YAML or in one of its subdirectories.
const localImage =
	/^\.\/(?:[A-Za-z0-9][A-Za-z0-9_-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp|avif)$/i;

export function isLocalScreenshot(src: string): boolean {
	return localImage.test(src);
}

export function screenshotUrl(
	projectSlug: string,
	screenshot: Screenshot,
	index: number,
): string {
	if (!isLocalScreenshot(screenshot.src)) return screenshot.src;

	const extension = screenshot.src.split(".").at(-1)?.toLowerCase();

	return `/media/screenshots/${projectSlug}/${index + 1}.${extension}`;
}
