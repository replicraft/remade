import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
	type Catalog,
	originalSchema,
	validateRelationships,
	vendorSchema,
} from "../../src/lib/schemas";
import {
	normalizeVendorSearch,
	vendorGroups,
	vendorHref,
} from "../../src/lib/vendors";
import { project } from "../fixtures/comparison";

function fixture(): Catalog {
	return {
		vendors: [
			{ slug: "autodesk", name: "Autodesk", aliases: ["Former Publisher"] },
			{ slug: "other", name: "Other" },
			{ slug: "empty", name: "Empty vendor" },
		],
		originals: [
			{
				slug: "first",
				name: "First",
				url: "https://example.org/first",
				category: "engineering",
				vendor: "autodesk",
			},
			{
				slug: "second",
				name: "Second",
				url: "https://example.org/second",
				category: "engineering",
				vendor: "autodesk",
			},
			{
				slug: "wanted",
				name: "Wanted",
				url: "https://example.org/wanted",
				category: "engineering",
				vendor: "autodesk",
				aliases: ["Wanted App"],
			},
			{
				slug: "other",
				name: "Other target",
				url: "https://example.org/other",
				category: "engineering",
				vendor: "other",
			},
		],
		projects: [
			{
				...project,
				originals: ["first", "second", "other"],
				status: "planned",
			},
		],
		tools: [
			{
				slug: "tool",
				repository: "https://github.com/example/tool",
				name: "Tool",
				url: "https://example.org/tool",
				summary: "A supporting tool.",
				description: "A tool adding functionality to the indexed project.",
				languages: ["Rust"],
				projects: ["alpha"],
			},
		],
		requests: [
			{
				original: "wanted",
				summary: "A wanted implementation.",
				reason: "Recreate this product's documented file behavior.",
			},
		],
		featured: [],
	};
}

describe("vendor coverage", () => {
	it("groups original software and counts a multi-target project once per vendor", () => {
		const catalog = fixture();
		validateRelationships(catalog);
		const [autodesk, other] = vendorGroups(catalog);
		expect(autodesk.vendor.slug).toBe("autodesk");
		expect(autodesk.software).toHaveLength(3);
		expect(autodesk.withProjects).toHaveLength(2);
		expect(autodesk.projectCount).toBe(1);
		expect(autodesk.withProjects[0].projects[0].status).toBe("planned");
		expect(autodesk.requested.map((row) => row.original.slug)).toEqual([
			"wanted",
		]);
		expect(other.software.map((row) => row.original.slug)).toEqual(["other"]);
		expect(
			vendorGroups(catalog).some((group) => group.vendor.slug === "empty"),
		).toBe(false);
	});

	it("retains the vendor after a request is fulfilled and removed", () => {
		const catalog = fixture();
		catalog.requests = [];
		catalog.projects.push({
			...project,
			slug: "fulfills",
			repository: "https://github.com/example/fulfills",
			originals: ["wanted"],
		});
		const group = vendorGroups(catalog)[0];
		expect(group.software).toHaveLength(3);
		expect(group.withProjects).toHaveLength(3);
		expect(group.requested).toHaveLength(0);
		expect(group.projectCount).toBe(2);
	});

	it("does not treat an original without a project or request as requested", () => {
		const catalog = fixture();
		catalog.requests = [];
		const group = vendorGroups(catalog)[0];
		expect(group.requested).toHaveLength(0);
		expect(group.unrequested.map((row) => row.original.slug)).toEqual([
			"wanted",
		]);
	});

	it("normalizes vendor names, slugs and accents for local search", () => {
		expect(normalizeVendorSearch(" Dassault-Systèmes ")).toBe(
			"dassault systemes",
		);
		expect(vendorGroups(fixture())[0].search).toContain("wanted app");
		expect(vendorGroups(fixture())[0].search).toContain("former publisher");
		expect(vendorHref("autodesk")).toBe("/vendor/autodesk/");
	});
});

it("validates vendor identity, unique names and original references", () => {
	expect(() =>
		v.parse(vendorSchema, { slug: "bad/slug", name: "Vendor" }),
	).toThrow();
	expect(() =>
		v.parse(vendorSchema, { slug: "valid", name: "Vendor", extra: true }),
	).toThrow();
	expect(() =>
		v.parse(originalSchema, {
			...fixture().originals[0],
			vendor: ["autodesk"],
		}),
	).toThrow();
	const unknown = fixture();
	unknown.originals[0].vendor = "missing";
	expect(() => validateRelationships(unknown)).toThrow("Unknown vendor");
	const duplicate = fixture();
	duplicate.vendors?.push({ slug: "duplicate", name: "Autodesk" });
	expect(() => validateRelationships(duplicate)).toThrow(
		"Duplicate vendor name",
	);
});

it("rejects vendor aliases that collide with another vendor name", () => {
	const catalog = fixture();
	catalog.vendors?.push({ slug: "former", name: "Former Publisher" });
	expect(() => validateRelationships(catalog)).toThrow("Duplicate vendor name");
});
