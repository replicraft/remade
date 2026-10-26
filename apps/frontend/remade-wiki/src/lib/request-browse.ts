import { isValid, isWithinInterval, parseISO, subDays } from "date-fns";
import type { CatalogData } from "./catalog";

export interface RequestFilters {
	q: string;
	vendor: string;
	category: string;
	added: string;
	sort: string;
}

export interface BrowseRequest {
	original: string;
	name: string;
	vendor: string;
	category: string;
	addedAt?: string;
	upvotes?: number;
	aliases?: string[];
	suggestedNames?: string[];
	reason?: string;
	summary?: string;
}

export const defaultRequestFilters: RequestFilters = {
	q: "",
	vendor: "",
	category: "",
	added: "",
	sort: "upvotes",
};
export const addedPeriods = ["7", "30", "90", "365"] as const;

export function matchingImplementations(
	catalog: Pick<CatalogData, "originals" | "entries">,
	query: string,
) {
	if (!query.trim()) return [];

	return catalog.entries
		.filter((entry) => entry.kind === "project")
		.map((entry) => {
			const originals = catalog.originals.filter((item) =>
				entry.originals.includes(item.slug),
			);

			return {
				entry,
				original: entry.slug,
				name: originals.map((o) => o.name).join(" · ") || entry.name,
				vendor: entry.authors?.join(" ") ?? "",
				category: entry.category,
				addedAt: entry.addedAt,
				aliases: [
					entry.name,
					...originals.flatMap((o) => o.aliases ?? []),
					...entry.originals,
					...entry.languages,
				],
				reason: entry.description,
				summary: entry.summary,
			};
		})
		.filter((item) =>
			filterRequest(item, { ...defaultRequestFilters, q: query }, new Date()),
		)
		.sort((a, b) => compareRequests(a, b, "recent", query))
		.map((item) => item.entry);
}

export function filterRequest(
	request: BrowseRequest,
	filters: RequestFilters,
	now: Date,
): boolean {
	const terms = filters.q
		.trim()
		.toLocaleLowerCase()
		.split(/\s+/)
		.filter(Boolean);
	const searchable = [
		request.name,
		request.original,
		request.vendor.replaceAll("-", " "),
		request.reason ?? "",
		request.summary ?? "",
		...(request.aliases ?? []),
		...(request.suggestedNames ?? []),
	]
		.join(" ")
		.toLocaleLowerCase();

	if (!terms.every((term) => searchable.includes(term))) return false;

	if (filters.vendor && request.vendor !== filters.vendor) return false;

	if (filters.category && request.category !== filters.category) return false;

	if (filters.added) {
		const date = parseISO(request.addedAt ?? "");

		if (!isValid(date)) return false;

		return isWithinInterval(date, {
			start: subDays(now, Number(filters.added)),
			end: now,
		});
	}

	return true;
}

export function compareRequests(
	a: BrowseRequest,
	b: BrowseRequest,
	sort: string,
	query = "",
) {
	if (sort === "upvotes") {
		const votes = (b.upvotes ?? 0) - (a.upvotes ?? 0);
		if (votes) return votes;
	}

	const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

	if (terms.length) {
		const titleScore = (name: string) => {
			const title = name.toLocaleLowerCase();

			if (title === terms.join(" ")) return terms.length + 2;

			if (title.includes(terms.join(" "))) return terms.length + 1;

			return terms.filter((term) => title.includes(term)).length;
		};
		const relevance = titleScore(b.name) - titleScore(a.name);

		if (relevance) return relevance;
	}

	if (sort === "name") return a.name.localeCompare(b.name);

	const aTime = a.addedAt ? Date.parse(a.addedAt) : Number.NaN;
	const bTime = b.addedAt ? Date.parse(b.addedAt) : Number.NaN;

	if (Number.isNaN(aTime) !== Number.isNaN(bTime))
		return Number.isNaN(aTime) ? 1 : -1;

	if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime)
		return sort === "oldest" ? aTime - bTime : bTime - aTime;

	return a.original.localeCompare(b.original);
}
