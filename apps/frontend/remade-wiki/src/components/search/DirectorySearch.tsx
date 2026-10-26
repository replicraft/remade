import { useState } from "react";
import {
	requestHref,
	type SearchRecord,
	searchDirectory,
} from "../../lib/directory";
export default function DirectorySearch({
	records,
}: {
	records: SearchRecord[];
}) {
	const [query, setQuery] = useState("");
	const matches = searchDirectory(records, query).slice(0, 5);
	return (
		<search className="hero-search">
			<form action="/explore/">
				<label htmlFor="site-search">
					Search software, projects, and requests
				</label>
				<div className="mt-2 flex gap-2">
					<input
						className="min-w-0 flex-1"
						id="site-search"
						name="q"
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Original software or reimplementation project name"
						type="search"
						value={query}
					/>
					<button className="action-secondary" type="submit">
						Search
					</button>
				</div>
			</form>
			{query.trim() && (
				<div
					aria-live="polite"
					className="mt-3 rounded-lg border border-line bg-surface p-2"
				>
					{matches.length ? (
						matches.map((record) => (
							<a
								className="flex flex-col gap-1 rounded p-3 hover:bg-panel"
								href={record.href}
								key={`${record.kind}-${record.id}`}
							>
								<span className="text-sm font-semibold">{record.name}</span>
								<span className="text-xs text-muted">
									{record.kind === "request"
										? "Project Request"
										: record.kind === "tool"
											? "Supporting tool"
											: `Project · ${record.target}`}
								</span>
							</a>
						))
					) : (
						<div className="p-3 text-sm">
							<p>No matching project is listed yet.</p>
							<a className="text-lime" href={requestHref(query)}>
								Request this software →
							</a>
						</div>
					)}
				</div>
			)}
		</search>
	);
}
