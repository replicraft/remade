import * as v from "valibot";
import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import { catalogExport } from "../../src/lib/catalog-export";
import { findBySlug } from "../../src/lib/presentation";
import { matchingImplementations } from "../../src/lib/request-browse";
import { projectSchema, validateRelationships } from "../../src/lib/schemas";

let catalog: Awaited<ReturnType<typeof loadCatalog>>;

beforeAll(async () => {
	catalog = await loadCatalog();
});

const targets = ["jira", "linear", "monday", "clickup"];

describe("multi-target implementations", () => {
	it("exports Plane once with all four targets", () => {
		const project = findBySlug(catalog.projects, "plane");

		expect(
			catalog.projects.filter((p) => p.repository === project.repository),
		).toHaveLength(1);

		expect(project.originals).toEqual(targets);

		const output = catalogExport(catalog, "https://remade.wiki/");

		expect(findBySlug(output.projects, "plane").originals).toEqual(targets);
	});

	it.each(targets)("is searchable and fulfills requests for %s", (slug) => {
		const original = findBySlug(catalog.originals, slug);

		expect(
			matchingImplementations(catalog, original.name).filter(
				(entry) => entry.slug === "plane",
			),
		).toHaveLength(1);

		expect(() =>
			validateRelationships({
				...catalog,
				requests: [
					{
						original: slug,
						summary: "A short overview of the requested workflows.",
						reason: "Please faithfully recreate this software.",
					},
				],
			}),
		).toThrow(/Fulfilled request/);
	});

	it.each(
		[[], "linear", null, [null], ["linear", "linear"], ["bad slug"]].map(
			(originals) => ({ originals }),
		),
	)("rejects malformed targets: %j", ({ originals }) => {
		expect(() =>
			v.parse(projectSchema, {
				...findBySlug(catalog.projects, "plane"),
				originals,
			}),
		).toThrow();
	});

	it.each(["missing", "singular", "mixed", "additional"])(
		"rejects %s legacy targets",
		(shape) => {
			const project = findBySlug(catalog.projects, "plane");
			const { originals, ...withoutTargets } = project;
			const cases = {
				missing: withoutTargets,
				singular: { ...withoutTargets, original: originals[0] },
				mixed: { ...project, original: originals[0] },
				additional: { ...project, additional_originals: ["linear"] },
			};

			expect(() =>
				v.parse(projectSchema, cases[shape as keyof typeof cases]),
			).toThrow();
		},
	);

	it.each([["missing"], ["jira", "jira"]])(
		"rejects invalid relationships: %j",
		(...originals) => {
			expect(() =>
				validateRelationships({
					...catalog,
					projects: [{ ...findBySlug(catalog.projects, "plane"), originals }],
				}),
			).toThrow();
		},
	);
});
