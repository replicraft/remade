import type { BrowseEntry } from "./browse";
import type { CatalogData, Entry, Metadata } from "./catalog";
import { entryCategories, metadataFor } from "./presentation";

export function browseData(
	entry: Entry,
	catalog: CatalogData,
	metadata: Record<string, Metadata>,
): BrowseEntry {
	const originals =
		entry.kind === "project"
			? catalog.originals.filter((o) => entry.originals.includes(o.slug))
			: [];

	return {
		name: entry.name,
		search: [
			entry.name,
			entry.summary,
			entry.description,
			...originals.flatMap((o) => [o.name, ...(o.aliases ?? [])]),
			...(entry.authors ?? []),
			...entry.languages,
			...(entry.kind === "tool"
				? catalog.suites
						.filter((suite) => entry.suites?.includes(suite.slug))
						.map((suite) => suite.name)
				: []),
		]
			.filter(Boolean)
			.join(" "),
		category: entry.kind === "project" ? entry.category : "tools",
		categories: entryCategories(entry, catalog.projects),
		languages: entry.languages,
		platforms: entry.platforms ?? [],
		status: entry.status ?? "",
		compatibility: entry.kind === "project" ? entry.compatibility : "",
		addedAt: entry.addedAt ?? "",
		stars: metadataFor(entry, metadata)?.stars ?? null,
	};
}
