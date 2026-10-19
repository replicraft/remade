import * as v from "valibot";
import { beforeAll, expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import { catalogExport } from "../../src/lib/catalog-export";
import { entryCategories, findBySlug } from "../../src/lib/presentation";
import {
	suiteSchema,
	toolSchema,
	validateRelationships,
} from "../../src/lib/schemas";
import { supportedProjectSlugs, toolTargets } from "../../src/lib/suites";

let catalog: Awaited<ReturnType<typeof loadCatalog>>;

beforeAll(async () => {
	catalog = await loadCatalog();
});

it.each([
	{ projects: [] },
	{ projects: ["one", "one"] },
	{ projects: "one" },
	{ projects: [null] },
	{ projects: ["Invalid"] },
	{ description: "<script>bad</script>" },
	{ extra: true },
])("rejects invalid suite fields: %j", (fields) => {
	expect(() =>
		v.parse(suiteSchema, {
			slug: "test-suite",
			name: "Test Suite",
			description: "A suite of related software projects.",
			projects: ["one"],
			...fields,
		}),
	).toThrow();
});

it("resolves suite membership without duplicating explicit projects", () => {
	const suite = findBySlug(catalog.suites, "artcraft");
	const launcher = findBySlug(catalog.tools, "artcraft-launcher");
	const tool = {
		...launcher,
		projects: [suite.projects[0], "extra"],
		suites: [suite.slug],
	};

	expect(supportedProjectSlugs(tool, [suite])).toEqual([
		suite.projects[0],
		"extra",
		...suite.projects.slice(1),
	]);
	expect(toolTargets(tool, [suite])).toEqual({
		suites: [suite],
		projects: ["extra"],
	});
	expect(() => supportedProjectSlugs(tool, [])).toThrow(/Unknown tool suite/);
});

it("keeps suite membership in tool categories and project backlinks while compacting display targets", () => {
	const suite = findBySlug(catalog.suites, "artcraft");
	const launcher = findBySlug(catalog.entries, "artcraft-launcher");
	const playground = findBySlug(catalog.tools, "openplayground");

	if (launcher.kind !== "tool") throw new Error("Expected a tool");

	expect(launcher.projects).toEqual(suite.projects);
	expect(entryCategories(launcher, catalog.projects)).toContain("creative");
	expect(toolTargets(launcher, catalog.suites).projects).toEqual([]);
	expect(toolTargets(playground, catalog.suites).projects).toEqual([
		"lightcraft-classic",
		"solidcraft",
		"mailcraft",
	]);
	expect(playground.projects).toHaveLength(16);

	for (const slug of suite.projects)
		expect(
			catalog.tools
				.filter((tool) => tool.projects.includes(slug))
				.map((tool) => tool.slug),
		).toContain("artcraft-launcher");
});

it.each([
	"unknown member",
	"unknown suite",
	"no targets",
	"duplicate slug",
	"duplicate name",
])("rejects invalid suite relationships: %s", (scenario) => {
	const suite = findBySlug(catalog.suites, "artcraft");
	const tool = findBySlug(catalog.tools, "artcraft-launcher");
	const input = { ...catalog, tools: [tool], suites: [suite], featured: [] };

	if (scenario === "unknown member")
		input.suites = [{ ...suite, projects: ["missing"] }];
	if (scenario === "unknown suite")
		input.tools = [{ ...tool, suites: ["missing"] }];
	if (scenario === "no targets")
		input.tools = [{ ...tool, projects: [], suites: undefined }];
	if (scenario === "duplicate slug") input.suites = [suite, suite];
	if (scenario === "duplicate name")
		input.suites = [
			suite,
			{ ...suite, slug: "other", name: suite.name.toUpperCase() },
		];

	expect(() => validateRelationships(input)).toThrow();
});

it("exports public suites and retains expanded project references for existing consumers", () => {
	const launcher = findBySlug(catalog.tools, "artcraft-launcher");
	const { projects: _projects, ...sourceTool } = launcher;
	const output = catalogExport(
		{
			...catalog,
			tools: [sourceTool],
			suites: catalog.suites.map((suite) => ({
				...suite,
				reviewNotes: "PRIVATE",
			})),
		},
		"https://remade.wiki/",
	);

	expect(output.schemaVersion).toBe(2);
	expect(output.tools[0].projects).toEqual(
		findBySlug(catalog.suites, "artcraft").projects,
	);
	expect(output.tools[0].suites).toEqual(["artcraft"]);
	expect(output.suites[0].pageUrl).toBe("https://remade.wiki/suites/artcraft/");
	expect(JSON.stringify(output.suites)).not.toContain("PRIVATE");

	const source = v.parse(toolSchema, sourceTool);

	expect(source.projects).toBeUndefined();
});
