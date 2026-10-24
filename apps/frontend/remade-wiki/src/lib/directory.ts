import { type BrowseEntry, compareEntries, filterEntries } from "./browse";
import type { CatalogData, Metadata } from "./catalog";
import { browseData } from "./explore";
import { entryUrl, label, metadataFor } from "./presentation";
import {
	compareRequests,
	defaultRequestFilters,
	filterRequest,
} from "./request-browse";
import { toolTargets } from "./suites";

export const pageSize = 24;
export interface DirectoryRecord extends BrowseEntry {
	id: string;
	kind: "project" | "tool" | "request";
	href: string;
	summary: string;
	description: string;
	target: string;
	aliases: string[];
	authors: string[];
	suites: { name: string; href: string }[];
	vendor: string;
	targets: { name: string; href: string }[];
	discord_server?: string;
	discord_thread?: string;
	originals?: { name: string; href: string }[];
	suggestedNames?: string[];
	fetchedAt?: string;
}

export type SearchRecord = Pick<
	DirectoryRecord,
	"id" | "kind" | "href" | "name" | "target" | "aliases" | "search"
>;
export function searchIndex(records: DirectoryRecord[]): SearchRecord[] {
	return records.map(({ id, kind, href, name, target, aliases, search }) => ({
		id,
		kind,
		href,
		name,
		target,
		aliases,
		search,
	}));
}

export function directoryRecords(
	catalog: CatalogData,
	metadata: Record<string, Metadata>,
): DirectoryRecord[] {
	return [
		...catalog.entries.map((entry): DirectoryRecord => {
			const targets =
				entry.kind === "project"
					? catalog.originals.filter((original) =>
							entry.originals.includes(original.slug),
						)
					: [];
			const suites =
				entry.kind === "project"
					? catalog.suites.filter((suite) =>
							suite.projects.includes(entry.slug),
						)
					: toolTargets(entry, catalog.suites).suites;
			return {
				...browseData(entry, catalog, metadata),
				id: entry.slug,
				kind: entry.kind,
				href: entryUrl(entry),
				summary: entry.summary,
				description: entry.description,
				originals: targets.map((original) => ({
					name: original.name,
					href: `/software/${original.slug}/`,
				})),
				fetchedAt: metadataFor(entry, metadata)?.fetchedAt,
				target:
					entry.kind === "project"
						? targets.map((original) => original.name).join(", ")
						: toolTargets(entry, catalog.suites)
								.projects.map(
									(slug) =>
										catalog.projects.find((project) => project.slug === slug)
											?.name,
								)
								.filter(Boolean)
								.join(", "),
				aliases: targets.flatMap((original) => [
					original.name,
					...(original.aliases ?? []),
				]),
				authors: entry.authors ?? [],
				vendor: "",
				targets:
					entry.kind === "tool"
						? toolTargets(entry, catalog.suites).projects.map((slug) => ({
								name:
									catalog.projects.find((project) => project.slug === slug)
										?.name ?? slug,
								href: `/projects/${slug}/`,
							}))
						: [],
				suites: suites.map((suite) => ({
					name: suite.name,
					href: `/suites/${suite.slug}/`,
				})),
				...(entry.kind === "project"
					? {
							discord_server: entry.discord_server,
							discord_thread: entry.discord_thread,
						}
					: {}),
				stars: metadataFor(entry, metadata)?.stars ?? null,
			};
		}),
		...catalog.requests.map((request): DirectoryRecord => {
			const original = catalog.originals.find(
				(original) => original.slug === request.original,
			);
			if (!original)
				throw new Error(`Unknown request target: ${request.original}`);
			return {
				id: original.slug,
				kind: "request",
				href: `/software/${original.slug}/`,
				name: original.name,
				summary: request.summary,
				description: request.reason,
				suggestedNames: request.suggested_names,
				search: [
					original.name,
					...(original.aliases ?? []),
					request.summary,
					request.reason,
					...(request.suggested_names ?? []),
				].join(" "),
				target: "Project Request",
				aliases: original.aliases ?? [],
				authors: [],
				suites: [],
				vendor: request.vendor,
				targets: [],
				category: original.category,
				languages: [],
				platforms: [],
				status: "",
				compatibility: "",
				addedAt: request.addedAt ?? "",
				stars: null,
				discord_server: request.discord_server,
				discord_thread: request.discord_thread,
			};
		}),
	];
}
export const normalizeQuery = (value: string) =>
	value.normalize("NFKC").toLocaleLowerCase().trim().replace(/\s+/g, " ");
export function searchDirectory<T extends SearchRecord>(
	records: T[],
	query: string,
): T[] {
	const normalized = normalizeQuery(query);
	const terms = normalized.split(" ").filter(Boolean);
	if (!terms.length) return [];
	const score = (record: SearchRecord) =>
		[record.name, record.target, ...record.aliases].some(
			(name) => normalizeQuery(name) === normalized,
		)
			? 0
			: normalizeQuery(record.name).startsWith(normalized)
				? 1
				: 2;
	return records
		.filter((record) =>
			terms.every((term) => normalizeQuery(record.search).includes(term)),
		)
		.sort(
			(a, b) =>
				score(a) - score(b) ||
				a.name.localeCompare(b.name) ||
				a.id.localeCompare(b.id),
		);
}
export function directoryResults(
	records: DirectoryRecord[],
	filters: Record<string, string>,
	kind: "project" | "request",
) {
	return records
		.filter((record) =>
			kind === "request"
				? record.kind === "request" &&
					filterRequest(
						{
							original: record.id,
							name: record.name,
							category: record.category,
							vendor: record.vendor,
							addedAt: record.addedAt,
							aliases: record.aliases,
							reason: record.description,
							summary: record.summary,
							suggestedNames: record.suggestedNames,
						},
						{ ...defaultRequestFilters, ...filters },
						new Date(),
					)
				: record.kind !== "request" && filterEntries(record, filters),
		)
		.sort((a, b) =>
			kind === "request"
				? compareRequests(
						{ original: a.id, ...a },
						{ original: b.id, ...b },
						filters.sort,
						filters.q,
					)
				: compareEntries(a, b, filters.sort),
		);
}
export function pageHref(kind: "project" | "request", page: number) {
	const base = kind === "request" ? "/requests/" : "/explore/";
	return page <= 1 ? base : `${base}page/${page}/`;
}
export const requestHref = (name = "") =>
	`/requests/new/${name ? `?${new URLSearchParams({ name })}` : ""}`;
export const categoryLabel = label;
