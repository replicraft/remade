import * as v from "valibot";
import { beforeAll, describe, expect, it } from "vitest";
import {
	type BrowseEntry,
	compareEntries,
	filterEntries,
} from "../../src/lib/browse";
import { loadCatalog, loadMetadata } from "../../src/lib/catalog";
import {
	badgeLanguages,
	entryCategories,
	findBySlug,
	label,
} from "../../src/lib/presentation";
import {
	type Catalog,
	parseYaml,
	projectSchema,
	toolSchema,
	validateRelationships,
} from "../../src/lib/schemas";

let catalog: Awaited<ReturnType<typeof loadCatalog>>;

beforeAll(async () => {
	catalog = await loadCatalog();
});

describe("catalog loading and validation", () => {
	it("accepts and labels planned projects without claiming working compatibility", () => {
		const project = v.parse(projectSchema, {
			...catalog.projects[0],
			status: "planned",
			compatibility: "targeting",
		});

		expect(project.status).toBe("planned");
		expect(label(project.status)).toBe("Planned");
	});

	it("preserves authored entries, project references and featured selections", () => {
		expect(catalog.entries).toHaveLength(
			catalog.projects.length + catalog.tools.length,
		);

		expect(catalog.entries.every((entry) => entry.slug)).toBe(true);

		for (const slug of catalog.featured)
			expect(catalog.entries.map((entry) => entry.slug)).toContain(slug);
	});

	it.each(["slug: one\nslug: two", "slug: !execute dangerous"])(
		"rejects invalid YAML: %s",
		(source) => {
			expect(() => parseYaml(source)).toThrow();
		},
	);

	it.each([
		{ unknown: true },
		{ description: "<script>alert(1)</script>" },
		{ repository: "https://localhost/x/y" },
		{ website: "http://example.org" },
		{ website: "https://localhost/" },
		{ mirrors: [] },
		{ mirrors: "https://codeberg.org/example/project" },
		{ mirrors: ["http://codeberg.org/example/project"] },
		{ mirrors: ["https://github.com/example/project/issues"] },
		{
			mirrors: [
				"https://codeberg.org/example/project",
				"https://codeberg.org/example/project.git",
			],
		},
		{ platforms: "Web" },
		{ authors: ["invalid--handle"] },
	])("rejects invalid project fields: %j", (extra) => {
		expect(() =>
			v.parse(projectSchema, { ...catalog.projects[0], ...extra }),
		).toThrow();
	});

	it.each([
		{ platforms: [null] },
		{ languages: [] },
		{ languages: [null] },
		{ status: "unknown" },
		{ docs: "http://example.org" },
		{ website: "https://localhost/" },
		{ limitations: "<b>bad</b>" },
		{ limitations: null },
		{ license: null },
		{ license: "" },
		{ license: 42 },
		{ license: "<b>MIT</b>" },
		{ mirrors: [] },
		{ mirrors: "https://codeberg.org/example/tool" },
		{ mirrors: ["http://example.org/tool"] },
		{ mirrors: ["https://github.com/example/tool/issues"] },
		{
			mirrors: [
				"https://codeberg.org/example/tool",
				"https://codeberg.org/example/tool.git",
			],
		},
	])("rejects invalid tool fields: %j", (extra) => {
		expect(() =>
			v.parse(toolSchema, { ...catalog.tools[0], ...extra }),
		).toThrow();
	});

	it("requires tool languages and preserves supported detail fields", () => {
		const { languages: _languages, ...withoutLanguages } = catalog.tools[0];

		expect(() => v.parse(toolSchema, withoutLanguages)).toThrow();

		const details = {
			languages: ["JavaScript"],
			status: "beta",
			docs: "https://example.org/docs",
			website: "https://example.org/",
			limitations: "Some host APIs are not supported.",
			license: "MIT",
			platforms: ["Web"],
			mirrors: ["https://codeberg.org/example/tool"],
		};

		expect(
			v.parse(toolSchema, { ...catalog.tools[0], ...details }),
		).toMatchObject(details);

		expect(
			v.parse(projectSchema, {
				...catalog.projects[0],
				website: "https://example.org/",
				mirrors: ["https://codeberg.org/example/project"],
			}),
		).toMatchObject({
			website: "https://example.org/",
			mirrors: ["https://codeberg.org/example/project"],
		});
	});

	it.each([
		"duplicate project",
		"missing feature",
		"missing tool target",
		"fulfilled request",
	])("rejects %s", (scenario) => {
		const input: Catalog = { ...catalog };

		if (scenario === "duplicate project")
			input.projects = [...catalog.projects, catalog.projects[0]];

		if (scenario === "missing feature") input.featured = ["missing"];

		if (scenario === "missing tool target")
			input.tools = [{ ...catalog.tools[0], projects: ["missing"] }];

		if (scenario === "fulfilled request")
			input.requests = [
				{
					original: catalog.projects[0].originals[0],
					reason: "A compatible implementation would be useful.",
				},
			];

		expect(() => validateRelationships(input)).toThrow();
	});

	it("does not let optional metadata control catalog inclusion", async () => {
		expect(await loadMetadata()).toBeTypeOf("object");

		expect(catalog.entries.length).toBeGreaterThan(0);
	});
});

const entry: BrowseEntry = {
	name: "Alpha",
	search: "Alpha Photoshop Rust",
	category: "other",
	languages: ["Rust"],
	platforms: ["Web"],
	status: "alpha",
	compatibility: "partial",
	stars: null,
	addedAt: "",
};

describe("entry filtering and sorting", () => {
	it.each([
		[{ q: "PHOTO rust", platform: "Web" }, true],
		[{ q: "photoshop", platform: "Windows" }, false],
		[{ status: "stable" }, false],
	] as const)("combines filters %j", (filters, matches) => {
		expect(filterEntries(entry, { ...filters })).toBe(matches);
	});

	it("puts missing stars after real zeroes and sorts additions newest first", () => {
		expect(
			compareEntries(entry, { ...entry, stars: 0 }, "stars"),
		).toBeGreaterThan(0);

		expect(
			compareEntries(
				{ ...entry, addedAt: "2026-10-09" },
				{ ...entry, addedAt: "2026-10-01" },
				"recent",
			),
		).toBeLessThan(0);
	});

	it("inherits every supported project category while retaining the tools filter", () => {
		const tool = findBySlug(catalog.entries, "openplayground");

		expect(tool.kind).toBe("tool");

		if (tool.kind !== "tool") throw new Error("Expected a tool");

		const expected = [
			...new Set(
				catalog.projects
					.filter((project) => tool.projects.includes(project.slug))
					.map((project) => project.category),
			),
		];

		expect(entryCategories(tool, catalog.projects)).toEqual(expected);

		const browse = { ...entry, category: "tools", categories: expected };

		for (const category of [...expected, "tools"])
			expect(filterEntries(browse, { category })).toBe(true);

		expect(filterEntries(browse, { category: "games" })).toBe(false);
	});
});

describe("language badges", () => {
	it.each([
		[
			["JavaScript", "TypeScript", "Rust"],
			["TypeScript", "Rust"],
		],
		[
			["JavaScript", "Rust"],
			["JavaScript", "Rust"],
		],
		[["JS", "TS"], ["TS"]],
		[["typescript", "javascript"], ["typescript"]],
	])(
		"formats %j without mutating recorded languages",
		(languages, expected) => {
			const original = [...languages];

			expect(badgeLanguages(languages)).toEqual(expected);

			expect(languages).toEqual(original);
		},
	);
});
