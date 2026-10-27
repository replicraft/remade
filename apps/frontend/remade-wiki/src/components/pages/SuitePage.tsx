import type { CatalogData, Metadata } from "../../lib/catalog";
import { findBySlug, metadataFor } from "../../lib/presentation";
import type { Suite } from "../../lib/schemas";
import EntryCard from "../catalog/EntryCard";
import PaginatedList from "../navigation/PaginatedList";

interface Props {
	suite: Suite;
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
}

export default function SuitePage({ suite, catalog, metadata }: Props) {
	const products = suite.projects.map((slug) =>
		findBySlug(catalog.entries, slug),
	);
	const tools = catalog.entries.filter(
		(entry) => entry.kind === "tool" && entry.suites?.includes(suite.slug),
	);

	return (
		<>
			<div className="max-w-[860px] pt-16">
				<p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-lime">
					Software suite
				</p>
				<h1 data-pagefind-meta="title">{suite.name}</h1>
				<p>{suite.description}</p>
			</div>

			<section aria-labelledby="suite-products">
				<h2 id="suite-products">
					Products <span className="text-lime">{products.length}</span>
				</h2>
				<PaginatedList
					className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3"
					id="suite-products-list"
					label="Products"
				>
					{products.map((entry) => (
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

			{tools.length > 0 && (
				<section aria-labelledby="suite-tools">
					<h2 id="suite-tools">Supporting tools</h2>
					<PaginatedList
						className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3"
						id="suite-tools-list"
						label="Supporting tools"
					>
						{tools.map((entry) => (
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
			)}
		</>
	);
}
