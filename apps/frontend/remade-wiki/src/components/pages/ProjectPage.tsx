import type { ReactNode } from "react";
import type { CatalogData, Metadata } from "../../lib/catalog";
import { findBySlug, label, metadataFor } from "../../lib/presentation";
import type { Project } from "../../lib/schemas";
import BadgeShareSection from "../badges/BadgeShareSection";
import Authors from "../catalog/Authors";
import DiscordLinks from "../catalog/DiscordLinks";
import EntryCard from "../catalog/EntryCard";
import OriginalLinks from "../catalog/OriginalLinks";
import RepositoryMirrors from "../catalog/RepositoryMirrors";
import Stats from "../catalog/Stats";

interface Props {
	project: Project;
	catalog: CatalogData;
	metadata: Record<string, Metadata>;
	children?: ReactNode;
}

export default function ProjectPage({
	project,
	catalog,
	metadata,
	children,
}: Props) {
	const entry = findBySlug(catalog.entries, project.slug);
	const related = catalog.entries.filter(
		(e) =>
			e.kind === "project" &&
			e.originals.some((slug) => project.originals.includes(slug)) &&
			e.slug !== project.slug,
	);
	const tools = catalog.entries.filter(
		(e) => e.kind === "tool" && e.projects.includes(project.slug),
	);

	return (
		<>
			<div className="max-w-[860px] pt-12 sm:pt-16">
				<a className="mb-5 inline-block text-sm text-muted" href="/explore/">
					← Explore projects
				</a>
				<p className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-lime">
					Reimplementation · {label(project.category)}
				</p>

				<h1 data-pagefind-meta="title">{project.name}</h1>

				<p>
					Reimplements{" "}
					<OriginalLinks
						className="text-sm text-lime hover:underline"
						originals={catalog.originals}
						project={project}
					/>
				</p>

				<p>{project.description}</p>

				<div className="flex flex-wrap items-center gap-6">
					<a
						className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-lime bg-lime px-4 py-3 text-sm font-semibold text-canvas hover:bg-lime-light hover:text-canvas"
						href={project.repository}
					>
						Source repository ↗
					</a>

					{project.website && (
						<a
							className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-lime hover:text-lime"
							href={project.website}
							rel="noopener noreferrer"
							target="_blank"
						>
							Website ↗
						</a>
					)}

					{project.docs && (
						<a
							className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-lime hover:text-lime"
							href={project.docs}
						>
							Documentation ↗
						</a>
					)}
				</div>

				{(project.discord_server || project.discord_thread) && (
					<div className="mt-8 rounded-xl border border-line bg-surface p-5">
						<h2 className="!mb-3 text-lg">Community</h2>
						<DiscordLinks {...project} />
						<p className="!mb-0 text-xs">
							Opens Discord. Some threads require server membership.
						</p>
					</div>
				)}

				<div className="mt-6">
					<RepositoryMirrors mirrors={project.mirrors} />

					<Authors authors={project.authors} />
				</div>
			</div>

			<section className="max-w-[780px]">
				<h2>Compatibility and scope</h2>

				<p className="border-l-2 border-lime bg-surface px-5 py-4">
					Status and compatibility are maintainer-reported. Inclusion is not an
					independent verification or certification.
				</p>

				<dl className="grid grid-cols-1 gap-4 min-[600px]:grid-cols-2 [&>div]:border-b [&>div]:border-line [&>div]:py-3">
					<div>
						<dt>Development status</dt>

						<dd>{label(project.status)}</dd>
					</div>

					<div>
						<dt>Compatibility</dt>

						<dd>{label(project.compatibility)} (claimed)</dd>
					</div>

					<div>
						<dt>Languages</dt>

						<dd>{project.languages.join(", ")}</dd>
					</div>

					<div>
						<dt>Platforms</dt>

						<dd>{project.platforms?.join(", ") || "Not documented"}</dd>
					</div>

					<div>
						<dt>License</dt>

						<dd>{project.license}</dd>
					</div>
				</dl>

				<h3 className="mt-8">Known limitations</h3>

				<p>
					{project.limitations ??
						"No specific limitations recorded. Consult the source repository for current coverage."}
				</p>
			</section>

			<Stats metadata={metadataFor(entry, metadata)} />

			<BadgeShareSection>{children}</BadgeShareSection>

			{tools.length > 0 && (
				<section>
					<h2>Supporting tools</h2>

					<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
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
					</div>
				</section>
			)}

			{related.length > 0 && (
				<section>
					<h2>
						{project.originals.length > 1
							? "More re-implementations of these targets"
							: `More re-implementations of ${catalog.originals
									.filter((o) => project.originals.includes(o.slug))
									.map((o) => o.name)
									.join(", ")}`}
					</h2>

					<div className="grid auto-rows-fr grid-cols-1 gap-[18px] min-[600px]:grid-cols-2 min-[900px]:grid-cols-3">
						{related.map((entry) => (
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
		</>
	);
}
