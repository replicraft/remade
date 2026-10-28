export type LegalSlug = "terms" | "privacy";

export type LegalDocument = {
	slug: LegalSlug;
	title: string;
	status: "draft" | "published";
	lastUpdated: string | null;
	operatorApproved: boolean;
};

// Publication is a reviewed content change, never an environment switch.
export const legalDocuments: LegalDocument[] = [
	{
		slug: "terms",
		title: "Terms of Service",
		status: "published",
		lastUpdated: "2026-10-27",
		operatorApproved: true,
	},
	{
		slug: "privacy",
		title: "Privacy Policy",
		status: "published",
		lastUpdated: "2026-10-27",
		operatorApproved: true,
	},
];

export function formatLegalDate(date: string) {
	return new Intl.DateTimeFormat("en", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	}).format(new Date(date));
}

export function unresolvedLegalFields(text: string) {
	return [
		...new Set(
			[...text.matchAll(/\[\[([A-Z][A-Z0-9_]*)\]\]/g)].map((match) => match[1]),
		),
	].sort();
}

export function legalPublicationIssues(
	document: LegalDocument,
	source: string,
) {
	const issues: string[] = [];
	if (document.status !== "published") issues.push("Document is a draft.");
	if (!document.operatorApproved) issues.push("Operator approval is missing.");
	if (
		!document.lastUpdated ||
		!/^\d{4}-\d{2}-\d{2}$/.test(document.lastUpdated) ||
		Number.isNaN(Date.parse(document.lastUpdated)) ||
		new Date(document.lastUpdated).toISOString().slice(0, 10) !==
			document.lastUpdated ||
		source.match(/^\*\*Last Updated:\*\*[ \t]*(.*)$/m)?.[1].trim() !==
			formatLegalDate(document.lastUpdated)
	)
		issues.push(
			"Last Updated date is missing, invalid or does not match the document.",
		);

	if (unresolvedLegalFields(source).length)
		issues.push("Unresolved publication fields remain.");
	if (/DRAFT FOR REVIEW/i.test(source))
		issues.push("The document still has its draft warning.");
	return issues;
}

export function legalRoutes(
	development: boolean,
	sources: Record<LegalSlug, string>,
	documents = legalDocuments,
) {
	return documents.filter((document) => {
		if (document.status === "published") {
			const issues = legalPublicationIssues(document, sources[document.slug]);
			if (issues.length)
				throw new Error(`Cannot publish ${document.slug}: ${issues.join(" ")}`);
			return true;
		}
		return development;
	});
}

export function legalNavigation(
	development: boolean,
	documents = legalDocuments,
) {
	return documents.filter(
		(document) => development || document.status === "published",
	);
}
