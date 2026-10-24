import { beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import {
	type BrowseRequest,
	compareRequests,
	defaultRequestFilters,
	filterRequest,
	matchingImplementations,
} from "../../src/lib/request-browse";

let catalog: Awaited<ReturnType<typeof loadCatalog>>;

beforeAll(async () => {
	catalog = await loadCatalog();
});

const now = new Date("2026-10-10T12:00:00Z");
const request: BrowseRequest = {
	original: "example",
	name: "Example",
	vendor: "adobe",
	category: "creative",
	addedAt: "2026-10-05T12:00:00Z",
};
const item = {
	...request,
	aliases: ["Legacy Title"],
	suggestedNames: ["ExampleCraft"],
	reason: "Compatible brush workflows",
};

describe("request search", () => {
	it.each(["Outlook", "mailcraft", "MonkeySaint", "calendar"])(
		"finds existing implementations for %s",
		(query) => {
			expect(
				matchingImplementations(catalog, query).map((entry) => entry.slug),
			).toContain("mailcraft");
		},
	);

	it.each(["  ", "nonexistent-xyz123"])(
		"returns no fallback for %j",
		(query) => {
			expect(matchingImplementations(catalog, query)).toEqual([]);
		},
	);

	it("returns only reimplementations in the fallback", () => {
		expect(
			matchingImplementations(catalog, "Rust").every(
				(entry) => entry.kind === "project",
			),
		).toBe(true);
	});

	it.each([" EXAMPLE ", "legacy title", "examplecraft", "adobe brush"])(
		"matches titles, aliases, suggestions and features: %s",
		(q) => {
			expect(filterRequest(item, { ...defaultRequestFilters, q }, now)).toBe(
				true,
			);
		},
	);

	it.each([{ q: "missing" }, { q: "Example", vendor: "apple" }])(
		"combines search and filters: %j",
		(filters) => {
			expect(
				filterRequest(item, { ...defaultRequestFilters, ...filters }, now),
			).toBe(false);
		},
	);
});

describe("request facets and dates", () => {
	it("combines vendor, category and addition period", () => {
		expect(
			filterRequest(
				request,
				{
					...defaultRequestFilters,
					vendor: "adobe",
					category: "creative",
					added: "7",
				},
				now,
			),
		).toBe(true);
	});

	it.each([{ vendor: "apple" }, { category: "engineering" }])(
		"rejects mismatched facets: %j",
		(filters) => {
			expect(
				filterRequest(request, { ...defaultRequestFilters, ...filters }, now),
			).toBe(false);
		},
	);

	it.each([
		{ addedAt: "2026-10-03T12:00:00Z", matches: true },
		{ addedAt: "2026-09-01T00:00:00Z", matches: false },
		{ addedAt: undefined, matches: false },
		{ addedAt: "invalid", matches: false },
		{ addedAt: "2026-10-11T00:00:00Z", matches: false },
	])(
		"handles period boundaries and unknown dates: %j",
		({ addedAt, matches }) => {
			expect(
				filterRequest(
					{ ...request, addedAt },
					{ ...defaultRequestFilters, added: "7" },
					now,
				),
			).toBe(matches);
		},
	);

	it("includes unknown dates when no period is selected", () => {
		expect(
			filterRequest(
				{ ...request, addedAt: undefined },
				defaultRequestFilters,
				now,
			),
		).toBe(true);
	});

	it.each([
		{ original: "logic-pro", vendor: "apple" },
		{ original: "adobe-character-animator", vendor: "adobe" },
	])(
		"derives vendors from paths without changing identity: %j",
		({ original, vendor }) => {
			expect(
				catalog.requests.find((item) => item.original === original)?.vendor,
			).toBe(vendor);
		},
	);
});

describe("request sorting", () => {
	it("defaults to most upvoted", () => {
		expect(defaultRequestFilters.sort).toBe("upvotes");
	});

	const newer = {
		...request,
		original: "newer",
		addedAt: "2026-10-06T00:30:00+02:00",
	};
	const older = {
		...request,
		original: "older",
		addedAt: "2026-10-05T22:00:00Z",
	};

	it("orders by descending votes before dates or search relevance", () => {
		expect(
			compareRequests(
				{ ...older, name: "Other", upvotes: 10 },
				{ ...newer, name: "Exact", upvotes: 2 },
				"upvotes",
				"Exact",
			),
		).toBeLessThan(0);
	});

	it("falls back to recent additions for equal or unavailable totals", () => {
		expect(
			compareRequests(
				{ ...newer, upvotes: 3 },
				{ ...older, upvotes: 3 },
				"upvotes",
			),
		).toBeLessThan(0);
		expect(compareRequests(newer, older, "upvotes")).toBeLessThan(0);
	});

	it("compares actual instants instead of timestamp strings", () => {
		expect(compareRequests(newer, older, "recent")).toBeLessThan(0);

		expect(compareRequests(newer, older, "oldest")).toBeGreaterThan(0);
	});

	it.each(["recent", "oldest"])(
		"keeps unknown dates last with %s sorting",
		(sort) => {
			expect(
				compareRequests({ ...request, addedAt: undefined }, newer, sort),
			).toBeGreaterThan(0);
		},
	);

	it("supports alphabetical order", () => {
		expect(
			compareRequests(
				{ ...request, name: "Alpha" },
				{ ...request, name: "Zebra" },
				"name",
			),
		).toBeLessThan(0);
	});

	const title = { ...request, name: "Brush", addedAt: "2026-09-01T00:00:00Z" };
	const phrase = { ...request, name: "Brush Studio" };
	const description = { ...request, name: "Alpha", reason: "Brush workflows" };

	it.each(["recent", "oldest", "name"])(
		"prioritizes title matches over other fields with %s sorting",
		(sort) => {
			expect(compareRequests(title, phrase, sort, " brush ")).toBeLessThan(0);

			expect(compareRequests(phrase, description, sort, "brush")).toBeLessThan(
				0,
			);
		},
	);

	it("uses the selected sort for equal relevance and still searches descriptions", () => {
		expect(compareRequests(title, description, "recent", "")).toBeGreaterThan(
			0,
		);

		expect(
			compareRequests(
				description,
				{ ...description, name: "Zebra" },
				"name",
				"brush",
			),
		).toBeLessThan(0);

		expect(
			filterRequest(description, { ...defaultRequestFilters, q: "brush" }, now),
		).toBe(true);
	});
});

it("searches card summaries as well as full request reasons", () => {
	const entry = { ...request, summary: "Specialist engraving workflows" };

	expect(
		filterRequest(entry, { ...defaultRequestFilters, q: "engraving" }, now),
	).toBe(true);
});
