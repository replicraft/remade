import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import type { Entry, Metadata } from "./catalog";
import type { Project } from "./schemas";

export type { Entry, Metadata } from "./catalog";

export const repositoryUrl = "https://github.com/replicraft/remade";
export const contributeUrl = `${repositoryUrl}/blob/main/CONTRIBUTING.md`;
const starFormatter = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});
export const formatStars = (stars: number) => starFormatter.format(stars);

export function badgeLanguages(languages: readonly string[]): string[] {
	const hasTypeScript = languages.some((language) =>
		["typescript", "ts"].includes(language.trim().toLowerCase()),
	);

	return languages
		.filter(
			(language) =>
				!hasTypeScript ||
				!["javascript", "js"].includes(language.trim().toLowerCase()),
		)
		.slice(0, 2);
}

export function shortDate(timestamp: string) {
	const date = parseISO(timestamp);

	return isValid(date) ? format(date, "MM/dd/yy hh:mm:ss a") : "Unavailable";
}

export function relativeDate(timestamp: string) {
	const date = parseISO(timestamp);

	return isValid(date)
		? formatDistanceToNow(date, { addSuffix: true })
		: "Unavailable";
}

export const label = (value: string) =>
	value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function entryCategories(
	entry: Entry,
	projects: readonly Project[],
): string[] {
	if (entry.kind === "project") return [entry.category];

	return [
		...new Set(
			projects
				.filter((project) => entry.projects.includes(project.slug))
				.map((project) => project.category),
		),
	];
}

export function metadataFor(entry: Entry, metadata: Record<string, Metadata>) {
	const url = new URL(entry.repository);

	return url.hostname === "github.com"
		? metadata[url.pathname.slice(1).toLowerCase()]
		: undefined;
}

export function entryUrl(entry: Entry) {
	return `/${entry.kind === "tool" ? "tools" : "projects"}/${entry.slug}/`;
}

export function recent(entries: Entry[]) {
	return [...entries].sort(
		(a, b) =>
			(b.addedAt ?? "").localeCompare(a.addedAt ?? "") ||
			a.name.localeCompare(b.name),
	);
}

export function findBySlug<T extends { slug: string }>(
	items: readonly T[],
	slug: string,
): T {
	const item = items.find((item) => item.slug === slug);

	if (!item) {
		throw new Error(`Missing catalog record: ${slug}`);
	}

	return item;
}
