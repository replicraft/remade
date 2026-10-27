import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { loadCatalog } from "../../lib/catalog";
import { catalogExport, jsonResponse } from "../../lib/catalog-export";

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
	if (!site)
		throw new Error("The site URL is required for public catalog exports.");

	const [catalog, projects, tools] = await Promise.all([
		loadCatalog(),
		getCollection("projects"),
		getCollection("tools"),
	]);
	const dates = new Map(catalog.entries.map((e) => [e.slug, e.addedAt]));

	return jsonResponse(
		catalogExport(
			{
				originals: catalog.originals,
				vendors: catalog.vendors,
				projects: projects.map((p) => ({
					...p.data,
					addedAt: dates.get(p.id),
				})),
				tools: tools.map((t) => ({ ...t.data, addedAt: dates.get(t.id) })),
				featured: catalog.featured,
				suites: catalog.suites,
			},
			site.href,
		),
	);
};
