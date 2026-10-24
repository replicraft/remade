import type { ReactNode } from "react";
import type { CatalogData, Metadata } from "../../lib/catalog";
import { requestHref } from "../../lib/directory";
import { label, metadataFor, repositoryUrl } from "../../lib/presentation";
import type { Original } from "../../lib/schemas";
import DiscordLinks from "../catalog/DiscordLinks";
import EntryCard from "../catalog/EntryCard";
import ListingDescription from "../catalog/ListingDescription";
import ProjectComparison from "../catalog/ProjectComparison";

export default function SoftwarePage({
	original,
	catalog,
	metadata,
	children,
}: {
	original: Original;
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
	children?: ReactNode;
}) {
	const entries = catalog.entries
		.filter((entry) => entry.kind === "project")
		.filter((entry) => entry.originals.includes(original.slug));
	const request = catalog.requests.find(
		(request) => request.original === original.slug,
	);

	return (
		<>
			<div className="max-w-[860px] pt-12 sm:pt-16">
				<a
					className="mb-6 inline-block text-sm text-muted"
					href={request ? "/requests/" : "/explore/"}
				>
					← {request ? "Project Requests" : "Explore projects"}
				</a>
				<p className="eyebrow">
					{request ? "Project Request" : "Original software"} ·{" "}
					{label(original.category)}
				</p>
				<h1 data-pagefind-meta="title">{original.name}</h1>
				{original.aliases?.length && (
					<p>Also known as {original.aliases.join(", ")}</p>
				)}

				{request && (
					<div className="mb-6">
						{children}

						<p className="mb-0 mt-3 max-w-[65ch] text-xs leading-5">
							Upvotes express interest. Builder indications are self-reported,
							not verified work or a reservation.
						</p>
					</div>
				)}

				<p>
					{request
						? "No implementation is currently listed. This is a community wish, not software ready to install."
						: `Independent implementations targeting ${original.name}, collected by the Remade community.`}
				</p>
				{!request && (
					<a className="text-sm underline" href={original.url}>
						Original software reference ↗
					</a>
				)}
			</div>

			{request && (
				<section className="!mt-8 max-w-[860px]">
					<h2>What people want recreated</h2>
					<ListingDescription
						description={request.reason}
						headingLevel={3}
						summary={request.summary}
					/>

					<div
						className={`grid gap-4 ${request.discord_thread || request.discord_server ? "sm:grid-cols-2" : ""}`}
					>
						<div className="rounded-xl bg-surface p-5 sm:p-6">
							<h2 className="mb-3 text-lg">Request details</h2>

							<a
								className="text-sm text-lime hover:underline"
								href={original.url}
							>
								Original software reference ↗
							</a>

							{request.suggested_names &&
								request.suggested_names.length > 0 && (
									<div className="mt-5">
										<h3 className="mb-2 text-sm font-semibold">
											Suggested names
										</h3>
										<p className="mb-0 text-sm leading-6">
											{request.suggested_names.join(", ")}
										</p>
									</div>
								)}
						</div>

						{(request.discord_thread || request.discord_server) && (
							<div className="rounded-xl bg-surface p-5 sm:p-6 [&>div]:mb-0">
								<h2 className="mb-3 text-lg">Community</h2>
								<DiscordLinks {...request} />
							</div>
						)}
					</div>

					<div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
						<div>
							<h2 className="mb-2 text-lg">Know an existing project?</h2>
							<p className="mb-0 text-sm">Suggest it for the catalog.</p>
						</div>

						<a
							className="action-secondary"
							href={`${repositoryUrl}/issues/new?template=catalog-suggestion.yml`}
						>
							Send a Catalog Suggestion ↗
						</a>
					</div>
				</section>
			)}
			{entries.length > 0 && (
				<section className="relative">
					<h2
						className={
							entries.length > 1 ? "min-h-[50px] pr-[160px]" : undefined
						}
					>
						Reimplementations{" "}
						<span className="text-muted">{entries.length}</span>
					</h2>
					<ProjectComparison
						metadata={metadata}
						originalName={original.name}
						projects={entries}
					/>
					<div className="directory-grid">
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
				</section>
			)}
			{!request && !entries.length && (
				<section>
					<h2>No implementation is currently listed.</h2>
					<p>
						Tell the community which workflows you would like to see recreated.
					</p>
					<a className="action-primary" href={requestHref(original.name)}>
						Request this software →
					</a>
				</section>
			)}
		</>
	);
}
