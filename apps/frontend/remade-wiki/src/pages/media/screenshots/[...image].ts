import { readFile } from "node:fs/promises";
import type { APIRoute } from "astro";
import { loadScreenshotAssets } from "../../../lib/catalog";
import type { ScreenshotAsset } from "../../../lib/screenshot-files";

export async function getStaticPaths() {
	return (await loadScreenshotAssets()).map((asset) => ({
		params: { image: asset.url.replace("/media/screenshots/", "") },
		props: { asset },
	}));
}

export const GET: APIRoute = async ({ props }) => {
	const asset = props.asset as ScreenshotAsset;

	return new Response(new Uint8Array(await readFile(asset.path)), {
		headers: {
			"Content-Type": asset.contentType,
			"X-Content-Type-Options": "nosniff",
			"Cache-Control": "public, max-age=3600",
		},
	});
};
