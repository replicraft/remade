import { useEffect, useMemo, useState } from "react";
import { compareEntries, filterEntries } from "../../lib/browse";
import type { CatalogData, Metadata } from "../../lib/catalog";
import { browseData } from "../../lib/explore";
import { contributeUrl, metadataFor, recent } from "../../lib/presentation";
import {
	compareRequests,
	defaultRequestFilters,
	filterRequest,
} from "../../lib/request-browse";
import {
	defaultFilters,
	fields,
	useExploreStore,
} from "../../stores/explore-store.ts";
import EntryCard from "../catalog/EntryCard";
import RequestCard from "../catalog/RequestCard";
import ExploreFilters from "../search/ExploreFilters";
import ExploreProvider from "../search/ExploreProvider";
import ExploreResultsToolbar from "../search/ExploreResultsToolbar";
import SiteSearchResults from "../search/SiteSearchResults";

interface Props {
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
}

export default function ExplorePage(props: Props) {
	return (
		<ExploreProvider>
			<ExploreContent {...props} />
		</ExploreProvider>
	);
}

function ExploreContent({ catalog, metadata }: Props) {
	const filters = useExploreStore((state) => state.filters);
	const setFilters = useExploreStore((state) => state.setFilters);
	const clear = useExploreStore((state) => state.clear);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const readUrl = () => {
			const params = new URLSearchParams(location.search);
			const next = { ...defaultFilters };

			for (const key of fields)
				next[key] = params.get(key) ?? defaultFilters[key];

			setFilters(next);
			setReady(true);
		};

		readUrl();
		window.addEventListener("popstate", readUrl);

		return () => window.removeEventListener("popstate", readUrl);
	}, [setFilters]);

	useEffect(() => {
		if (!ready) return;

		const params = new URLSearchParams();

		for (const key of fields)
			if (filters[key] && filters[key] !== defaultFilters[key])
				params.set(key, filters[key]);

		history.replaceState(
			null,
			"",
			`${location.pathname}${params.size ? `?${params}` : ""}`,
		);
	}, [filters, ready]);

	const languages = useMemo(
		() =>
			[...new Set(catalog.entries.flatMap((entry) => entry.languages))].sort(),
		[catalog],
	);
	const platforms = useMemo(
		() =>
			[...new Set(catalog.entries.flatMap((p) => p.platforms ?? []))].sort(),
		[catalog],
	);
	const entries = useMemo(
		() =>
			recent(catalog.entries)
				.filter((entry) =>
					filterEntries(browseData(entry, catalog, metadata), { ...filters }),
				)
				.sort((a, b) =>
					compareEntries(
						browseData(a, catalog, metadata),
						browseData(b, catalog, metadata),
						filters.sort,
					),
				),
		[catalog, metadata, filters],
	);
	const matchingRequests = useMemo(() => {
		if (entries.length || !filters.q.trim()) return [];

		return catalog.requests
			.map((request) => {
				const original = catalog.originals.find(
					(item) => item.slug === request.original,
				);

				if (!original) return undefined;

				return {
					request,
					original: request.original,
					target: original,
					name: original.name,
					category: original.category,
					vendor: request.vendor,
					addedAt: request.addedAt,
					aliases: original.aliases,
					suggestedNames: request.suggested_names,
					reason: request.reason,
					summary: request.summary,
				};
			})
			.filter((request) => request !== undefined)
			.filter((request) =>
				filterRequest(
					request,
					{ ...defaultRequestFilters, q: filters.q },
					new Date(),
				),
			)
			.sort((a, b) => compareRequests(a, b, "recent", filters.q));
	}, [catalog, entries.length, filters.q]);

	return (
		<>
			<div className="max-w-[860px] pt-16">
				<p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-lime">
					The directory
				</p>

				<h1>Find what’s been remade.</h1>

				<p>
					{catalog.projects.length} reimplementations and {catalog.tools.length}{" "}
					supporting tools. Browse by the software you know or the technology
					you use.
				</p>
			</div>

			<ExploreFilters languages={languages} platforms={platforms} />

			<noscript>
				<p>
					All entries are listed below. Enable JavaScript for filtering,
					sorting, and indexed search.
				</p>
			</noscript>

			<ExploreResultsToolbar count={entries.length} />

			<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
				{entries.map((entry) => (
					<EntryCard
						entry={entry}
						key={entry.slug}
						metadata={metadataFor(entry, metadata)}
						originals={catalog.originals}
						projects={catalog.projects}
						suites={catalog.suites}
					/>
				))}
			</div>

			{entries.length === 0 && (
				<div className="rounded-xl border border-dashed border-line p-8">
					<h2>No matching entries</h2>

					<p>
						Try another search, clear the filters, or{" "}
						<a className="text-lime hover:underline" href={contributeUrl}>
							contribute a project
						</a>
						.
					</p>

					<button
						className="rounded-lg border border-line px-4 py-3 text-sm font-semibold hover:border-lime"
						onClick={clear}
						type="button"
					>
						Clear filters
					</button>
				</div>
			)}

			{matchingRequests.length > 0 && (
				<section aria-labelledby="matching-requests" className="mt-8">
					<h2 id="matching-requests">Matching Project Requests</h2>

					<p>
						Your search matches these community requests. These are wishes, not
						existing implementations.
					</p>

					<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
						{matchingRequests.map(({ request, target }) => (
							<RequestCard
								key={request.original}
								original={target}
								request={request}
							/>
						))}
					</div>

					<a
						className="mt-4 inline-block text-sm text-lime hover:underline"
						href={`/requests/?${new URLSearchParams({ q: filters.q })}`}
					>
						Search Project Requests →
					</a>
				</section>
			)}

			<SiteSearchResults query={filters.q} />

			<div className="mt-8 flex flex-wrap items-center justify-between gap-4">
				<p className="mb-0 text-xs text-muted">
					GitHub statistics are refreshed approximately every 24 hours. Unknown
					counts sort after available counts.
				</p>

				<a
					className="inline-flex items-center rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-lime hover:text-lime"
					href={contributeUrl}
				>
					Add a project
				</a>
			</div>
		</>
	);
}
