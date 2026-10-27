import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { loadCatalog } from "../../lib/catalog";
import { jsonResponse, requestsExport } from "../../lib/catalog-export";

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
	if (!site)
		throw new Error("The site URL is required for public request exports.");

	const [catalog, requests] = await Promise.all([
		loadCatalog(),
		getCollection("requests"),
	]);

	return jsonResponse(
		requestsExport(
			{
				originals: catalog.originals,
				vendors: catalog.vendors,
				requests: requests.map((r) => r.data),
			},
			site.href,
		),
	);
};
