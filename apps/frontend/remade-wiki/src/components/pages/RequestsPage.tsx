import { useEffect, useMemo, useState } from "react";
import type { CatalogData, Metadata } from "../../lib/catalog";
import {
	contributeUrl,
	findBySlug,
	label,
	metadataFor,
	repositoryUrl,
} from "../../lib/presentation";
import {
	addedPeriods,
	compareRequests,
	defaultRequestFilters,
	filterRequest,
	matchingImplementations,
	type RequestFilters,
} from "../../lib/request-browse";
import { useRequestActivity } from "../../stores/request-activity-store";
import EntryCard from "../catalog/EntryCard";
import RequestCard from "../catalog/RequestCard";
import RequestActions from "../requests/RequestActions";
import RequestActivityProvider from "../requests/RequestActivityProvider";

interface Props {
	catalog: Pick<CatalogData, "originals" | "requests" | "entries"> &
		Partial<Pick<CatalogData, "suites">>;
	metadata: Record<string, Metadata>;
}

export default function RequestsPage({ catalog, metadata }: Props) {
	return (
		<RequestActivityProvider>
			<RequestList catalog={catalog} metadata={metadata} />
		</RequestActivityProvider>
	);
}

function RequestList({ catalog, metadata }: Props) {
	const activity = useRequestActivity((state) => state.activity);
	const [filters, setFilters] = useState<RequestFilters>(defaultRequestFilters);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		const readUrl = () => {
			const params = new URLSearchParams(location.search);
			const vendor = params.get("vendor") ?? "";
			const category = params.get("category") ?? "";
			const added = params.get("added") ?? "";
			const sort = params.get("sort") ?? defaultRequestFilters.sort;

			setFilters({
				q: params.get("q") ?? "",
				vendor,
				category,
				added: addedPeriods.some((period) => period === added) ? added : "",
				sort: ["upvotes", "recent", "oldest", "name"].includes(sort)
					? sort
					: defaultRequestFilters.sort,
			});
			setReady(true);
		};

		readUrl();
		window.addEventListener("popstate", readUrl);

		return () => window.removeEventListener("popstate", readUrl);
	}, []);
	useEffect(() => {
		if (!ready) return;

		const params = new URLSearchParams();

		for (const key of ["q", "vendor", "category", "added", "sort"] as const)
			if (filters[key] && filters[key] !== defaultRequestFilters[key])
				params.set(key, filters[key]);

		history.replaceState(
			null,
			"",
			`${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`,
		);
	}, [filters, ready]);

	const allRequests = useMemo(
		() =>
			catalog.requests.map((request) => {
				const original = findBySlug(catalog.originals, request.original);

				return {
					request,
					original,
					name: original.name,
					category: original.category,
					vendor: request.vendor,
					addedAt: request.addedAt,
					aliases: original.aliases,
					suggestedNames: request.suggested_names,
					reason: request.reason,
					summary: request.summary,
				};
			}),
		[catalog],
	);
	const vendors = [...new Set(allRequests.map((item) => item.vendor))].sort();
	const categories = [
		...new Set(allRequests.map((item) => item.category)),
	].sort();
	const requests = allRequests
		.filter((item) =>
			filterRequest(
				{ ...item, original: item.original.slug },
				filters,
				new Date(),
			),
		)
		.sort((a, b) =>
			compareRequests(
				{
					...a,
					original: a.original.slug,
					upvotes: activity[a.original.slug]?.upvotes,
				},
				{
					...b,
					original: b.original.slug,
					upvotes: activity[b.original.slug]?.upvotes,
				},
				filters.sort,
				filters.q,
			),
		);
	const implementations = requests.length
		? []
		: matchingImplementations(catalog, filters.q);
	const change = (key: keyof RequestFilters, value: string) =>
		setFilters((previous) => ({ ...previous, [key]: value }));
	const select = (
		key: keyof RequestFilters,
		title: string,
		options: { value: string; text: string }[],
	) => (
		<label className="min-w-0 text-xs">
			{title}

			<span className="relative mt-1.5 block">
				<select
					className="mt-0 w-full appearance-none bg-canvas py-2 pl-3 pr-10 text-sm"
					name={key}
					onChange={(event) => change(key, event.target.value)}
					value={filters[key]}
				>
					{options.map((option) => (
						<option key={option.value} value={option.value}>
							{option.text}
						</option>
					))}
				</select>

				<svg
					aria-hidden="true"
					className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					viewBox="0 0 24 24"
				>
					<path d="m6 9 6 6 6-6" />
				</svg>
			</span>
		</label>
	);

	return (
		<>
			<div className="max-w-[860px] pt-16">
				<p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-lime">
					The community wishlist
				</p>

				<h1>Project Requests</h1>

				<p>
					Software people would like to see independently reimplemented. These
					are community wishes, not active or approved implementation projects.
				</p>

				<div className="flex flex-wrap items-center gap-6">
					<a
						className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-lime bg-lime px-4 py-3 text-sm font-semibold text-canvas hover:bg-lime-light hover:text-canvas"
						href={`${repositoryUrl}/issues/new?template=project-request.yml`}
					>
						Submit a request ↗
					</a>

					<a
						className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-lime hover:text-lime"
						href={contributeUrl}
					>
						Know a project? Add it ↗
					</a>
				</div>
			</div>

			<section>
				{catalog.requests.length > 0 && (
					<>
						<form
							className="mb-6 border-b border-line pb-6"
							onSubmit={(event) => event.preventDefault()}
						>
							<label className="mb-4 block text-xs">
								Search requests
								<input
									className="mt-1.5 w-full bg-canvas px-3 py-2 text-sm"
									name="q"
									onChange={(event) => change("q", event.target.value)}
									placeholder="Software, suggested name, vendor or features"
									type="search"
									value={filters.q}
								/>
							</label>

							<div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-3">
								{select("vendor", "Vendor", [
									{ value: "", text: "All vendors" },
									...vendors.map((value) => ({
										value,
										text: value === "unassigned" ? "Unassigned" : label(value),
									})),
								])}

								{select("category", "Category", [
									{ value: "", text: "All categories" },
									...categories.map((value) => ({ value, text: label(value) })),
								])}

								{select("added", "Added", [
									{ value: "", text: "Any time" },
									...addedPeriods.map((value) => ({
										value,
										text: value === "365" ? "Past year" : `Past ${value} days`,
									})),
								])}
							</div>

							<div className="mt-4 flex flex-wrap items-end justify-between gap-4">
								{select("sort", "Sort by", [
									{ value: "upvotes", text: "Most upvoted" },
									{ value: "recent", text: "Recently added" },
									{ value: "oldest", text: "Oldest first" },
									{ value: "name", text: "Alphabetical" },
								])}

								<button
									className="text-sm text-muted hover:text-lime"
									onClick={() => setFilters({ ...defaultRequestFilters })}
									type="button"
								>
									Clear filters
								</button>
							</div>
						</form>

						<p aria-live="polite" className="mb-5 text-sm" role="status">
							{requests.length} {requests.length === 1 ? "request" : "requests"}
						</p>

						<noscript>
							<p>
								All requests are listed below. Enable JavaScript to filter and
								sort them.
							</p>
						</noscript>
					</>
				)}

				{catalog.requests.length ? (
					<>
						<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
							{requests.map(({ request, original }) => (
								<RequestCard
									actions={<RequestActions original={original.slug} />}
									key={request.original}
									original={original}
									request={request}
								/>
							))}
						</div>

						{requests.length === 0 && (
							<p className="rounded-xl border border-dashed border-line p-8">
								No matching requests. Try another filter or clear the filters.
							</p>
						)}
					</>
				) : (
					<p className="rounded-xl border border-dashed border-line p-8">
						There are no open requests. Suggest a software target using the
						request form.
					</p>
				)}

				{implementations.length > 0 && (
					<section aria-labelledby="matching-implementations" className="mt-8">
						<h2 id="matching-implementations">Matching implementations</h2>

						<p>
							Your search matches these indexed projects. Requests are removed
							when an implementation is listed, even if it is still in early
							development. Check each project's status and limitations.
						</p>

						<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
							{implementations.map((entry) => (
								<EntryCard
									entry={entry}
									key={entry.slug}
									metadata={metadataFor(entry, metadata)}
									originals={catalog.originals}
									projects={catalog.entries.filter(
										(entry) => entry.kind === "project",
									)}
									suites={catalog.suites}
								/>
							))}
						</div>

						<a
							className="mt-4 inline-block text-sm text-lime hover:underline"
							href={`/explore/?${new URLSearchParams({ q: filters.q })}`}
						>
							Search implementations →
						</a>
					</section>
				)}
			</section>
		</>
	);
}
