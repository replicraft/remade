import { beforeAll, expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import {
	catalogExport,
	jsonResponse,
	requestsExport,
} from "../../src/lib/catalog-export";

const site = "https://remade.wiki/";

it("exports preserve public relationships and strip unlisted fields at every level", async () => {
	const catalog = cachedCatalog;
	const internal = { reviewNotes: "PRIVATE EDITORIAL NOTE", id: "INTERNAL ID" };
	const discord = {
		discord_server: "https://discord.gg/export-test",
		discord_thread: "https://discord.com/channels/123/456/789",
	};
	const originals = catalog.originals.map((o) => ({ ...o, ...internal }));
	const output = catalogExport(
		{
			originals,
			projects: catalog.entries
				.filter((e) => e.kind === "project")
				.map((p) => ({ ...p, ...internal, ...discord })),
			tools: catalog.entries
				.filter((e) => e.kind === "tool")
				.map((t) => ({
					...t,
					...internal,
					mirrors: ["https://codeberg.org/example/tool"],
					languages: ["JavaScript"],
					status: "beta" as const,
					docs: "https://example.org/docs",
					website: "https://example.org",
					limitations: "Some host APIs are not supported.",
				})),
			featured: catalog.featured,
			suites: catalog.suites,
		},
		site,
	);
	const requests = requestsExport(
		{
			originals,
			requests: catalog.requests.map((r) => ({
				...r,
				...internal,
				...discord,
			})),
		},
		site,
	);
	const serialized = JSON.stringify({ output, requests });

	expect(!serialized.includes("PRIVATE EDITORIAL NOTE")).toBeTruthy();

	expect(!serialized.includes("INTERNAL ID")).toBeTruthy();

	for (const entry of [...output.projects, ...requests.requests]) {
		expect(entry).not.toHaveProperty("discord_server");
		expect(entry).not.toHaveProperty("discord_thread");
	}

	expect(serialized).not.toContain(discord.discord_server);
	expect(serialized).not.toContain(discord.discord_thread);

	expect(output.schemaVersion).toBe(2);

	expect(requests.schemaVersion).toBe(2);

	expect(output.projects.length).toBe(catalog.projects.length);

	expect(output.tools.length).toBe(catalog.tools.length);

	expect(requests.requests.length).toBe(catalog.requests.length);

	expect(output.featured).toEqual(catalog.featured);

	for (const project of output.projects) {
		expect(
			project.originals.every((slug) =>
				output.originals.some((o) => o.slug === slug),
			),
		).toBeTruthy();

		expect(!("original" in project)).toBeTruthy();

		expect(!("additional_originals" in project)).toBeTruthy();

		expect(project.pageUrl).toBe(`${site}projects/${project.slug}/`);
	}

	expect(
		output.tools.find((t) => t.slug === "lazymaplayers-effectcraft")?.license,
	).toBe("MIT");

	for (const tool of output.tools) {
		expect(tool.mirrors).toEqual(["https://codeberg.org/example/tool"]);

		expect(tool.languages).toEqual(["JavaScript"]);

		expect(tool.status).toBe("beta");

		expect(tool.docs).toBe("https://example.org/docs");

		expect(tool.website).toBe("https://example.org");

		expect(tool.limitations).toBe("Some host APIs are not supported.");

		expect(tool.pageUrl).toBe(`${site}tools/${tool.slug}/`);

		expect(
			tool.projects.every((slug) =>
				output.projects.some((p) => p.slug === slug),
			),
		).toBeTruthy();
	}

	for (const request of requests.requests) {
		expect(request.software.slug).toBe(request.original);

		expect(request.software.pageUrl).toBe(
			`${site}software/${request.original}/`,
		);

		expect(
			!output.projects.some((p) => p.originals.includes(request.original)),
		).toBeTruthy();
	}

	expect(output.projects.map((p) => p.slug)).toEqual(
		output.projects.map((p) => p.slug).sort(),
	);
});

it("request export fails for dangling originals", () => {
	expect(() =>
		requestsExport(
			{
				originals: [],
				requests: [
					{
						original: "missing",
						reason: "A compatible implementation is requested.",
						vendor: "example",
					},
				],
			},
			site,
		),
	).toThrow(/Unknown exported request original/);
});

it("JSON responses allow public cross-origin reads and one-hour caching", async () => {
	const response = jsonResponse({ schemaVersion: 1 });

	expect(response.headers.get("Content-Type")).toBe(
		"application/json; charset=utf-8",
	);

	expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");

	expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");

	expect(await response.json()).toEqual({ schemaVersion: 1 });
});

let cachedCatalog: Awaited<ReturnType<typeof loadCatalog>>;

beforeAll(async () => {
	cachedCatalog = await loadCatalog();
});
