import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
	type LegalDocument,
	legalDocuments,
	legalNavigation,
	legalPublicationIssues,
	legalRoutes,
	unresolvedLegalFields,
} from "../../src/lib/legal";

const approved: LegalDocument = {
	slug: "terms",
	title: "Terms of Service",
	status: "published",
	lastUpdated: "2026-01-01",
	operatorApproved: true,
};
const approvedSource = "# Terms\n\n**Last Updated:** January 1, 2026\n";
const sources = { terms: approvedSource, privacy: "# Privacy" };
const draft: LegalDocument = {
	...approved,
	status: "draft",
	operatorApproved: false,
};

describe("legal publication boundaries", () => {
	it("omits draft routes and legal footer links from production", () => {
		expect(legalRoutes(false, sources, [draft])).toEqual([]);
		expect(legalNavigation(false, [draft])).toEqual([]);
	});

	it("makes drafts available in development only", () => {
		expect(legalRoutes(true, sources, [draft])).toEqual([draft]);
		expect(legalNavigation(true, [draft])).toEqual([draft]);
	});

	it("requires matching approved metadata before emitting a published route", () => {
		expect(legalPublicationIssues(approved, approvedSource)).toEqual([]);
		expect(legalRoutes(false, sources, [approved])).toEqual([approved]);
	});

	it.each([
		{ operatorApproved: false },
		{ lastUpdated: null },
		{ lastUpdated: "not-a-date" },
		{ lastUpdated: "2026-02-30" },
		{ lastUpdated: "2026-01-02" },
	])("rejects publication with unresolved metadata: %j", (change) => {
		expect(() =>
			legalRoutes(false, sources, [{ ...approved, ...change }]),
		).toThrow("Cannot publish terms");
	});

	it.each(["[[OPERATOR_LEGAL_NAME]]", "DRAFT FOR REVIEW"])(
		"rejects unapproved source text: %s",
		(text) => {
			expect(() =>
				legalRoutes(
					false,
					{ ...sources, terms: `${approvedSource}\n${text}` },
					[approved],
				),
			).toThrow("Cannot publish terms");
		},
	);

	it("deduplicates unresolved fields without filling them in", () => {
		expect(
			unresolvedLegalFields("[[VERSION]] [[OPERATOR]] [[VERSION]]"),
		).toEqual(["OPERATOR", "VERSION"]);
	});

	it("publishes the approved policies with matching text and navigation", async () => {
		const realSources = { terms: "", privacy: "" };
		for (const document of legalDocuments) {
			const filename = `${document.slug}.md`;
			const source = await readFile(
				new URL(`../../src/content/legal/${filename}`, import.meta.url),
				"utf8",
			);
			realSources[document.slug] = source;
			expect(unresolvedLegalFields(source)).toEqual([]);
			expect(source).toContain("**Last Updated:** October 27, 2026");
			expect(source).toContain("Replicraft");
			expect(source).not.toContain("[[MINIMUM_ACCOUNT_AGE]]");
			expect(source).not.toContain("[[OPERATOR_LEGAL_NAME]]");
			expect(source).not.toContain("**Version:**");
			expect(source).not.toContain("**Effective date:**");
			expect(document.operatorApproved).toBe(true);
			expect(document.status).toBe("published");
			expect(legalPublicationIssues(document, source)).toEqual([]);
		}
		expect(
			legalRoutes(false, realSources).map((document) => document.slug),
		).toEqual(["terms", "privacy"]);
		expect(legalNavigation(false)).toEqual(legalDocuments);
	});
});
