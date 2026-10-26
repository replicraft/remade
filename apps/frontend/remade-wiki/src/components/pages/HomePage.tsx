import type { ReactNode } from "react";
import type { CatalogData, Metadata } from "../../lib/catalog";
import { categories } from "../../lib/constants";
import { directoryRecords } from "../../lib/directory";
import { label, recent, repositoryUrl } from "../../lib/presentation";
import DirectoryCard from "../catalog/DirectoryCard";
export default function HomePage({
	catalog,
	metadata,
	children,
	requestPreview,
}: {
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
	children?: ReactNode;
	requestPreview?: ReactNode;
}) {
	const records = directoryRecords(catalog, metadata);
	const featured = catalog.featured
		.map((slug) =>
			records.find((record) => record.kind !== "request" && record.id === slug),
		)
		.filter((record) => record !== undefined);
	const requests = records
		.filter((record) => record.kind === "request")
		.sort(
			(a, b) =>
				b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name),
		)
		.slice(0, 6);
	return (
		<>
			<div className="home-hero">
				<p className="eyebrow">The independent software directory</p>
				<h1>
					Everything can be remade<span className="text-lime">.</span>
				</h1>
				<p className="hero-intro">
					Discover independent software reimplementations.
					<br className="hidden sm:block" /> Request the software you want to
					see remade next.
				</p>
				<div className="flex flex-wrap items-center gap-4">
					<a className="action-primary" href="/requests/new/">
						Request a project <span aria-hidden="true">→</span>
					</a>
					<a className="action-secondary" href="/explore/">
						Explore projects
					</a>
				</div>
				{children}
			</div>
			<section aria-labelledby="featured-heading">
				<div className="section-heading">
					<div>
						<h2 id="featured-heading">Featured</h2>
					</div>
				</div>
				<div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm text-muted">
					<p className="mb-0">
						Check each project's status to see what is available.
					</p>
					<span>Selected by Remade</span>
				</div>
				<div className="directory-grid featured-grid">
					{featured.slice(0, 5).map((record) => (
						<DirectoryCard key={record.id} record={record} />
					))}
				</div>
			</section>
			<section aria-labelledby="requests-heading">
				<div className="section-heading">
					<div>
						<p className="eyebrow">What’s missing?</p>
						<h2 id="requests-heading">Project Requests</h2>
					</div>
					<a href="/requests/">View all requests →</a>
				</div>
				<p className="section-intro">
					Software the community wants to see remade. A request is a wish, not a
					promise that it will be built.
				</p>
				{requestPreview ?? (
					<div className="directory-grid">
						{requests.map((record) => (
							<DirectoryCard key={record.id} record={record} />
						))}
					</div>
				)}
				<div className="section-note">
					<p>
						Search first. Support an existing request or tell us what is
						missing.
					</p>
					<a href="/requests/new/">Request a project →</a>
				</div>
			</section>
			<section>
				<div className="section-heading">
					<h2>Browse by category</h2>
					<a href="/explore/">Explore all →</a>
				</div>
				<div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
					{categories.map((category) => (
						<a
							className="flex items-center justify-between border-b border-line py-4 text-sm"
							href={`/explore/?category=${category}`}
							key={category}
						>
							<span>{label(category)}</span>
							<span className="text-muted">
								{
									catalog.projects.filter(
										(project) => project.category === category,
									).length
								}{" "}
								→
							</span>
						</a>
					))}
					<a
						className="border-b border-line py-4 text-sm"
						href="/explore/?category=tools"
					>
						Supporting tools →
					</a>
				</div>
			</section>
			<section>
				<div className="section-heading">
					<h2>Recently added</h2>
					<a href="/explore/">View all projects →</a>
				</div>
				<div className="directory-grid">
					{recent(catalog.entries)
						.slice(0, 3)
						.map((entry) => {
							const record = records.find(
								(record) =>
									record.id === entry.slug && record.kind !== "request",
							);
							return (
								record && <DirectoryCard key={entry.slug} record={record} />
							);
						})}
				</div>
			</section>
			<section className="resource-section">
				<div>
					<p className="eyebrow">Open to everyone</p>
					<h2>Use Remade's data</h2>
					<p>
						Download the catalog and project requests for your tools, research,
						or agents.
					</p>
					<div className="flex flex-wrap gap-5 text-sm">
						<a href="/data/catalog.json">Catalog JSON ↗</a>
						<a href="/data/requests.json">Requests JSON ↗</a>
					</div>
				</div>
				<div className="border-t border-line pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
					<h3>Found an existing project?</h3>
					<p>
						Help others discover it. Maintainers review every Catalog Suggestion
						before listing.
					</p>
					<a
						className="text-sm"
						href={`${repositoryUrl}/issues/new?template=catalog-suggestion.yml`}
					>
						Suggest an existing project ↗
					</a>
				</div>
			</section>
		</>
	);
}
