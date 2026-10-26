import type { FilterOption } from "./DirectoryFilters";

interface Props {
	filters: Record<string, string>;
	options: FilterOption[];
	count: number;
	onChange: (key: string, value: string) => void;
	onClear: () => void;
}

export default function RequestFilters({
	filters,
	options,
	count,
	onChange,
	onClear,
}: Props) {
	const select = (key: string, title: string, empty?: string) => (
		<label className="min-w-0 text-xs">
			{title}
			<span className="relative mt-1.5 block">
				<select
					className="mt-0 w-full appearance-none bg-canvas py-2 pl-3 pr-10 text-sm"
					name={key}
					onChange={(event) => onChange(key, event.target.value)}
					value={filters[key] ?? ""}
				>
					{empty && <option value="">{empty}</option>}
					{options
						.find((option) => option.key === key)
						?.values.map((option) => (
							<option key={option.value} value={option.value}>
								{option.name}
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
		<div className="my-8">
			<form
				className="mb-6 border-b border-line pb-6"
				onSubmit={(event) => event.preventDefault()}
			>
				<label className="mb-4 block text-xs">
					Search requests
					<input
						className="mt-1.5 w-full bg-canvas px-3 py-2 text-sm"
						id="site-search"
						name="q"
						onChange={(event) => onChange("q", event.target.value)}
						placeholder="Software, suggested name, vendor or features"
						type="search"
						value={filters.q}
					/>
				</label>
				<div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-3">
					{select("vendor", "Vendor", "All vendors")}
					{select("category", "Category", "All categories")}
					{select("added", "Added", "Any time")}
				</div>
				<div className="mt-4 flex flex-wrap items-end justify-between gap-4">
					{select("sort", "Sort by")}
					<button
						className="text-sm text-muted hover:text-lime"
						onClick={onClear}
						type="button"
					>
						Clear filters
					</button>
				</div>
			</form>
			<p aria-live="polite" className="mb-5 text-sm" role="status">
				{count} {count === 1 ? "request" : "requests"}
			</p>
		</div>
	);
}
