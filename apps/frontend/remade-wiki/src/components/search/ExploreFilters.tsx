import { categories, compatibility, statuses } from "../../lib/constants";
import { label } from "../../lib/presentation";
import type { ExploreFilters } from "../../stores/explore-store.ts";

export default function ExploreFiltersPanel({
	languages,
	platforms,
	filters,
	onChange: change,
	onClear: clear,
}: {
	languages: string[];
	platforms: string[];
	filters: ExploreFilters;
	onChange: (key: keyof ExploreFilters, value: string) => void;
	onClear: () => void;
}) {
	const select = (
		key: Exclude<keyof ExploreFilters, "q" | "sort">,
		title: string,
		options: readonly string[],
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
					<option value="">
						{
							{
								category: "All categories",
								language: "All languages",
								platform: "All platforms",
								status: "All statuses",
								compatibility: "All targets",
							}[key]
						}
					</option>

					{options.map((value) => (
						<option key={value} value={value}>
							{["category", "status", "compatibility"].includes(key)
								? label(value)
								: value}
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
		<search className="my-8 border-b border-line pb-6">
			<form onSubmit={(event) => event.preventDefault()}>
				<div className="max-w-[740px]">
					<label htmlFor="site-search">Search software and projects</label>
					<input
						className="mt-2 w-full"
						id="site-search"
						name="q"
						onChange={(event) => change("q", event.target.value)}
						placeholder="Original software or reimplementation project name"
						type="search"
						value={filters.q}
					/>
				</div>

				<div className="mt-5 grid grid-cols-1 items-end gap-3 min-[600px]:grid-cols-3">
					{select("category", "Category", [...categories, "tools"])}

					{select("language", "Language", languages)}

					{select("platform", "Platform", platforms)}
				</div>

				<div className="mt-4 flex items-start justify-between gap-4">
					<details
						className="min-w-0 flex-1"
						open={Boolean(filters.status || filters.compatibility) || undefined}
					>
						<summary className="w-fit cursor-pointer text-sm text-muted hover:text-lime">
							More filters
						</summary>

						<div className="mt-4 grid max-w-[640px] grid-cols-1 gap-3 min-[600px]:grid-cols-2">
							{select("status", "Status", statuses)}

							{select("compatibility", "Compatibility", compatibility)}
						</div>

						<p className="mb-0 mt-2 text-xs">
							Status and compatibility are maintainer-reported.
						</p>
					</details>

					<button
						className="shrink-0 text-sm text-muted hover:text-lime"
						onClick={() => clear()}
						type="button"
					>
						Clear filters
					</button>
				</div>
			</form>
		</search>
	);
}
