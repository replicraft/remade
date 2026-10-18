import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import { jsonResponse } from "../../src/lib/catalog-export";
import { parseLauncher } from "../../src/lib/launcher-config";
import { parseYaml } from "../../src/lib/schemas";

it("preserves explicit allowlist order without adding catalog metadata", async () => {
	const result = parseLauncher("projects: [second, first]", [
		"first",
		"second",
		"third",
	]);

	expect(await jsonResponse(result).json()).toEqual({
		projects: ["second", "first"],
	});
	expect(parseLauncher("projects: []", ["first"])).toEqual({ projects: [] });
});

it.each([
	"[]",
	"{}",
	"projects: null",
	"projects: first",
	"projects: [42]",
	'projects: [""]',
	'projects: [" first"]',
	"projects: [First]",
	"projects: [first, first]",
	"projects: [missing]",
	"projects: [original]",
	"projects: [tool]",
	"projects: []\nextra: true",
	"projects: []\nprojects: [first]",
	"projects: !execute []",
])("rejects invalid launcher configuration with its filename: %s", (source) => {
	expect(() => parseLauncher(source, ["first"])).toThrow(/launcher.yaml/);
});

it("serializes the actual validated YAML configuration exactly", async () => {
	const source = await readFile("../../../launcher.yaml", "utf8");
	const catalog = await loadCatalog();

	expect(await jsonResponse(catalog.launcher).json()).toEqual(
		parseYaml(source),
	);
});
