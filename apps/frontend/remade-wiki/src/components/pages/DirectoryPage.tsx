import { useEffect, useMemo, useState } from "react";
import {
	type DirectoryRecord,
	directoryResults,
	pageHref,
	pageSize,
	requestHref,
	searchDirectory,
} from "../../lib/directory";
import { label, repositoryUrl } from "../../lib/presentation";
import type { RequestActivity } from "../../lib/request-activity";
import { defaultFilters as exploreDefaults } from "../../stores/explore-store";
import { useRequestActivity } from "../../stores/request-activity-store";
import DirectoryCard from "../catalog/DirectoryCard";
import RequestActions from "../requests/RequestActions";
import RequestActivityProvider from "../requests/RequestActivityProvider";
import RequestPreview from "../requests/RequestPreview";
import type { FilterOption } from "../search/DirectoryFilters";
import ExploreFiltersPanel from "../search/ExploreFilters";
import ExploreResultsToolbar from "../search/ExploreResultsToolbar";
import RequestFilters from "../search/RequestFilters";

type Props = {
	records: DirectoryRecord[];
	kind: "project" | "request";
	initialPage?: number;
	featured: string[];
};
const keys = [
	"q",
	"category",
	"language",
	"platform",
	"status",
	"compatibility",
	"vendor",
	"added",
	"sort",
	"featured",
];
export default function DirectoryPage(props: Props) {
	return props.kind === "request" ? (
		<RequestActivityProvider>
			<RequestDirectory {...props} />
		</RequestActivityProvider>
	) : (
		<DirectoryContent {...props} activity={{}} />
	);
}
function RequestDirectory(props: Props) {
	const activity = useRequestActivity((state) => state.activity);
	return <DirectoryContent {...props} activity={activity} />;
}
function DirectoryContent({
	records,
	kind,
	initialPage = 1,
	featured,
	activity,
}: Props & { activity: Record<string, RequestActivity> }) {
	const defaults = useMemo(
		() => ({ q: "", sort: kind === "request" ? "upvotes" : "recent" }),
		[kind],
	);
	const [filters, setFilters] = useState<Record<string, string>>(defaults);
	const [page, setPage] = useState(initialPage);
	const [ready, setReady] = useState(false);

	const options = useMemo<FilterOption[]>(() => {
		const source = records.filter((record) =>
			kind === "request"
				? record.kind === "request"
				: record.kind !== "request",
		);
		const values = (key: keyof DirectoryRecord) =>
			[
				...new Set(
					source.flatMap((record) =>
						Array.isArray(record[key])
							? (record[key] as string[])
							: [String(record[key] ?? "")],
					),
				),
			]
				.filter(Boolean)
				.sort()
				.map((value) => ({ value, name: label(value) }));
		return [
			{ key: "category", name: "Categories", values: values("category") },
			...(kind === "project"
				? [
						{ key: "language", name: "Languages", values: values("languages") },
						{ key: "platform", name: "Platforms", values: values("platforms") },
						{ key: "status", name: "Status", values: values("status") },
						{
							key: "compatibility",
							name: "Compatibility",
							values: values("compatibility"),
						},
					]
				: [
						{ key: "vendor", name: "Vendors", values: values("vendor") },
						{
							key: "added",
							name: "Added",
							values: [
								{ value: "7", name: "Last 7 days" },
								{ value: "30", name: "Last 30 days" },
								{ value: "90", name: "Last 90 days" },
								{ value: "365", name: "Last year" },
							],
						},
					]),
			{
				key: "sort",
				name: "Sort",
				values:
					kind === "request"
						? [
								{ value: "upvotes", name: "Most upvoted" },
								{ value: "recent", name: "Recently added" },
								{ value: "oldest", name: "Oldest first" },
								{ value: "name", name: "Name" },
							]
						: [
								{ value: "recent", name: "Recently added" },
								{ value: "stars", name: "GitHub stars" },
								{ value: "name", name: "Name" },
							],
			},
		];
	}, [records, kind]);
	useEffect(() => {
		const read = () => {
			const params = new URLSearchParams(location.search);
			const next: Record<string, string> = { ...defaults };
			for (const key of keys) {
				const value = params.get(key);
				if (value !== null) next[key] = value.slice(0, 300);
			}
			for (const option of options) {
				if (
					next[option.key] &&
					!option.values.some((value) => value.value === next[option.key])
				)
					next[option.key] = option.key === "sort" ? defaults.sort : "";
			}
			setFilters(next);
			setPage(Number(location.pathname.match(/\/page\/([0-9]+)/)?.[1] ?? 1));
			setReady(true);
		};
		read();
		window.addEventListener("popstate", read);
		return () => window.removeEventListener("popstate", read);
	}, [defaults, options]);
	const change = (next: Record<string, string>) => {
		setFilters(next);
		setPage(1);
		const params = new URLSearchParams();
		for (const key of keys)
			if (next[key] && next[key] !== defaults[key as keyof typeof defaults])
				params.set(key, next[key]);
		history.replaceState(
			null,
			"",
			`${pageHref(kind, 1)}${params.size ? `?${params}` : ""}`,
		);
	};
	const results = useMemo(
		() =>
			directoryResults(
				records.filter(
					(record) =>
						!filters.featured ||
						(record.kind !== "request" && featured.includes(record.id)),
				),
				filters,
				kind,
			).sort((a, b) =>
				kind === "request" && filters.sort === "upvotes"
					? (activity[b.id]?.upvotes ?? -1) - (activity[a.id]?.upvotes ?? -1) ||
						a.name.localeCompare(b.name)
					: 0,
			),
		[records, filters, kind, featured, activity],
	);
	const pages = Math.max(1, Math.ceil(results.length / pageSize));
	const current = Math.min(page, pages);
	const visible = results.slice((current - 1) * pageSize, current * pageSize);
	const alternatives = filters.q
		? searchDirectory(records, filters.q)
				.filter((record) =>
					kind === "request"
						? record.kind !== "request"
						: record.kind === "request",
				)
				.slice(0, 3)
		: [];
	const title = kind === "request" ? "Project Requests" : "Explore projects";
	return (
		<>
			<div className="flex flex-wrap items-end justify-between gap-6 pt-12 sm:pt-16">
				<div className="max-w-[720px]">
					<p className="eyebrow">
						{kind === "request" ? "The community wishlist" : "The directory"}
					</p>
					<h1 className="!mb-4">{title}</h1>
					<p className="!mb-0">
						{kind === "request"
							? "Software the community wants to see remade. Find a request to support, or tell us what is missing."
							: "Independent reimplementations and supporting tools. Find familiar software, then check its scope and status."}
					</p>
				</div>
				<a className="action-primary" href="/requests/new/">
					Request a project →
				</a>
			</div>
			{kind === "project" ? (
				<div data-client-controls>
					<ExploreFiltersPanel
						filters={{ ...exploreDefaults, ...filters }}
						languages={
							options
								.find((option) => option.key === "language")
								?.values.map((option) => option.value) ?? []
						}
						onChange={(key, value) => change({ ...filters, [key]: value })}
						onClear={() => change(defaults)}
						platforms={
							options
								.find((option) => option.key === "platform")
								?.values.map((option) => option.value) ?? []
						}
					/>
					<ExploreResultsToolbar
						count={results.length}
						onChange={(sort) => change({ ...filters, sort })}
						sort={filters.sort}
					/>
				</div>
			) : (
				<div data-client-controls>
					<RequestFilters
						count={results.length}
						filters={filters}
						onChange={(key, value) => change({ ...filters, [key]: value })}
						onClear={() => change(defaults)}
						options={options}
					/>
				</div>
			)}
			<noscript>
				<p className="my-6 rounded-lg border border-line p-4">
					Browse this page and use the page links below. Enable JavaScript for
					search and filters.
				</p>
				<style>{`[data-client-controls]{display:none}`}</style>
			</noscript>
			<div className="directory-grid" id="directory-results">
				{visible.map((record) => (
					<DirectoryCard
						actions={
							record.kind === "request" ? (
								<RequestActions original={record.id} />
							) : undefined
						}
						key={`${record.kind}-${record.id}`}
						record={record}
					/>
				))}
			</div>
			{visible.length === 0 && (
				<div className="rounded-xl border border-dashed border-line p-8">
					<h2>
						No matching {kind === "request" ? "request" : "project"} is listed
						yet.
					</h2>
					<p>
						Try another search, browse related{" "}
						{kind === "request" ? "projects" : "requests"}, or request this
						software.
					</p>
					<div className="flex flex-wrap gap-3">
						<a className="action-primary" href={requestHref(filters.q)}>
							Request this software
						</a>
						<button
							className="action-secondary"
							onClick={() => change(defaults)}
							type="button"
						>
							Clear filters
						</button>
					</div>
				</div>
			)}
			{alternatives.length > 0 && (
				<section>
					<h2>
						Related {kind === "request" ? "projects" : "Project Requests"}
					</h2>
					{kind === "project" ? (
						<RequestPreview records={alternatives} />
					) : (
						<div className="directory-grid">
							{alternatives.map((record) => (
								<DirectoryCard key={record.id} record={record} />
							))}
						</div>
					)}
				</section>
			)}
			<nav
				aria-label="Pagination"
				className="my-8 flex flex-wrap items-center justify-center gap-2"
			>
				{Array.from({ length: pages }, (_, index) => index + 1).map(
					(number) => {
						const params = new URLSearchParams();
						if (ready)
							for (const key of keys)
								if (
									filters[key] &&
									filters[key] !== defaults[key as keyof typeof defaults]
								)
									params.set(key, filters[key]);
						return (
							<a
								aria-current={number === current ? "page" : undefined}
								className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm ${number === current ? "border-lime text-lime" : "border-line"}`}
								href={`${pageHref(kind, number)}${params.size ? `?${params}` : ""}`}
								key={number}
							>
								{number}
							</a>
						);
					},
				)}
			</nav>
			<div className="section-note">
				<p>
					{kind === "request"
						? "Maintainers review requests before they are listed."
						: "GitHub statistics are refreshed approximately every 24 hours."}
				</p>
				<a href={`${repositoryUrl}/issues/new?template=catalog-suggestion.yml`}>
					Suggest an existing project ↗
				</a>
			</div>
		</>
	);
}
