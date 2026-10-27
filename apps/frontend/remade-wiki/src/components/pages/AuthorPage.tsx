import { authorProfile } from "../../lib/author-profile";
import type { CatalogData, Metadata } from "../../lib/catalog";
import { metadataFor } from "../../lib/presentation";
import EntryCard from "../catalog/EntryCard";
import PaginatedList from "../navigation/PaginatedList";

interface Props {
	user: string;
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
}

export default function AuthorPage({ user, catalog, metadata }: Props) {
	const entries = catalog.entries
		.filter((e) => e.authors?.includes(user))
		.sort((a, b) => a.name.localeCompare(b.name));

	const profile = authorProfile(
		user,
		entries.map((entry) => entry.repository),
	);

	return (
		<>
			<div className="max-w-[860px] pt-16">
				<p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-lime">
					By author
				</p>

				<h1 data-pagefind-meta="title">@{user}</h1>

				<p>
					All indexed projects and tools credited to this user or organization,
					including entries outside Featured.
				</p>

				<a
					className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-lime hover:text-lime"
					href={profile.href}
				>
					{profile.name} profile ↗
				</a>
			</div>

			{(["project", "tool"] as const).map((kind) => {
				const group = entries.filter((e) => e.kind === kind);

				return (
					group.length > 0 && (
						<section key={kind}>
							<h2>
								{kind === "tool" ? "Supporting tools" : "Reimplementations"}{" "}
								<span className="text-lime">{group.length}</span>
							</h2>

							<PaginatedList
								className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3"
								id={`author-${kind}`}
								label={
									kind === "tool" ? "Supporting tools" : "Reimplementations"
								}
							>
								{group.map((entry) => (
									<EntryCard
										entry={entry}
										key={entry.slug}
										metadata={metadataFor(entry, metadata)}
										originals={catalog.originals}
										projects={catalog.projects}
										suites={catalog.suites}
									/>
								))}
							</PaginatedList>
						</section>
					)
				);
			})}
		</>
	);
}
