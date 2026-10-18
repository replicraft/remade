import type { APIRoute } from "astro";
import { loadCatalog } from "../../lib/catalog";
import { jsonResponse } from "../../lib/catalog-export";

export const prerender = true;

export const GET: APIRoute = async () => {
	const { launcher } = await loadCatalog();

	return jsonResponse(launcher);
};
