export default function ExploreResultsToolbar({
	count,
	sort,
	onChange: change,
}: {
	count: number;
	sort: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
			<p aria-live="polite" className="mb-0 text-sm" role="status">
				{count} {count === 1 ? "entry" : "entries"}
			</p>

			<label className="flex items-center gap-2 text-xs">
				Sort by
				<span className="relative block">
					<select
						className="mt-0 w-auto appearance-none border-0 bg-transparent py-1 pl-2 pr-8 text-sm text-ink"
						name="sort"
						onChange={(event) => change(event.target.value)}
						value={sort}
					>
						<option value="recent">Recently added</option>

						<option value="name">Alphabetical</option>

						<option value="stars">GitHub stars</option>
					</select>

					<svg
						aria-hidden="true"
						className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-ink"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						viewBox="0 0 24 24"
					>
						<path d="m6 9 6 6 6-6" />
					</svg>
				</span>
			</label>
		</div>
	);
}
