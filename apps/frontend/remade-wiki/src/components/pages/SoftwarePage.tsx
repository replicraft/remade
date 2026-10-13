import type { ReactNode } from "react";
import type { CatalogData, Metadata } from "../../lib/catalog";
import { contributeUrl, label, metadataFor } from "../../lib/presentation";
import type { Original } from "../../lib/schemas";
import EntryCard from "../catalog/EntryCard";
import ProjectComparison from "../catalog/ProjectComparison";

interface Props {
	original: Original;
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
	children?: ReactNode;
}

export default function SoftwarePage({
	original,
	catalog,
	metadata,
	children,
}: Props) {
	const entries = catalog.entries
		.filter((entry) => entry.kind === "project")
		.filter((entry) => entry.originals.includes(original.slug));
	const request = catalog.requests.find((r) => r.original === original.slug);

	return (
		<>
			<div className="max-w-[860px] pt-16">
				<p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-lime">
					Original software · {label(original.category)}
				</p>

				<h1 data-pagefind-meta="title">{original.name}</h1>

				{original.aliases?.length && (
					<p>Also known as {original.aliases.join(", ")}</p>
				)}

				<p>
					Independent implementations targeting {original.name}, collected by
					the Remade community.
				</p>

				<a
					className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-lime hover:text-lime"
					href={original.url}
				>
					Original software reference ↗
				</a>
			</div>

			<section className="relative">
				{request && <div className="mb-8">{children}</div>}

				<h2
					className={entries.length > 1 ? "min-h-[50px] pr-[160px]" : undefined}
				>
					Reimplementations <span className="text-lime">{entries.length}</span>
				</h2>

				<ProjectComparison
					metadata={metadata}
					originalName={original.name}
					projects={entries}
				/>

				{entries.length ? (
					<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
						{entries.map((entry) => (
							<EntryCard
								entry={entry}
								key={entry.slug}
								metadata={metadataFor(entry, metadata)}
								originals={catalog.originals}
								projects={catalog.projects}
							/>
						))}
					</div>
				) : (
					<p className="rounded-xl border border-dashed border-line p-8">
						No qualifying implementation is currently indexed.
					</p>
				)}
			</section>

			{request && (
				<section className="max-w-[780px]">
					<h2>Project Request</h2>

					<p>{request.reason}</p>

					{request.suggested_names && (
						<p>
							Suggested names:{" "}
							<span className="text-lime">
								{request.suggested_names.join(", ")}
							</span>
						</p>
					)}

					<p>
						These are community wishes, not active implementation projects or
						reserved names.
					</p>

					<a
						className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-lime bg-lime px-4 py-3 text-sm font-semibold text-canvas hover:bg-lime-light hover:text-canvas"
						href={contributeUrl}
					>
						Know a project? Add it ↗
					</a>
				</section>
			)}
		</>
	);
}
