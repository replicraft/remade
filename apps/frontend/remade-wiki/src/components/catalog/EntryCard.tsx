import {
	badgeLanguages,
	type Entry,
	entryUrl,
	formatStars,
	label,
	type Metadata,
	relativeDate,
	shortDate,
} from "../../lib/presentation";
import type { Original, Project, Suite } from "../../lib/schemas";
import Authors from "./Authors";
import CardDescription from "./CardDescription";
import OriginalLinks from "./OriginalLinks";
import ToolTargets from "./ToolTargets";

interface Props {
	entry: Entry;
	originals: Original[];
	projects: Project[];
	metadata?: Metadata;
	suites?: Suite[];
}

export default function EntryCard({
	entry,
	originals,
	projects,
	metadata,
	suites = [],
}: Props) {
	return (
		<article className="relative isolate flex h-full min-h-[280px] min-w-0 flex-col rounded-xl border border-line bg-surface p-[22px] text-sm hover:border-lime/50 focus-within:border-lime sm:p-[26px]">
			<div className="mb-3.5 flex shrink-0 flex-wrap gap-2">
				<span className="rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted">
					{entry.kind === "tool" ? "Tool" : label(entry.status)}
				</span>

				{entry.kind === "tool" && entry.status && (
					<span className="rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted">
						{label(entry.status)}
					</span>
				)}

				{entry.languages.length > 0 && (
					<span className="rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted">
						{badgeLanguages(entry.languages).join(" · ")}
					</span>
				)}

				{metadata && (
					<a
						className="relative z-10 rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted"
						href={entryUrl(entry)}
						title={`${metadata.stars.toLocaleString("en")} GitHub stars · Last successful update: ${relativeDate(metadata.fetchedAt)} (${shortDate(metadata.fetchedAt)})`}
					>
						★ {formatStars(metadata.stars)}
					</a>
				)}
			</div>

			<h3 className="shrink-0">
				<a
					className="after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-lime"
					href={entryUrl(entry)}
				>
					{entry.name}
				</a>
			</h3>

			<p className="mb-3.5 shrink-0 text-xs">
				{entry.kind === "project" ? (
					<>
						Replaces:{" "}
						<OriginalLinks
							className="relative z-10 text-lime hover:underline"
							originals={originals}
							project={entry}
						/>
					</>
				) : (
					<>
						Tool for{" "}
						<ToolTargets projects={projects} suites={suites} tool={entry} />
					</>
				)}
			</p>

			{entry.kind === "project" &&
				suites
					.filter((suite) => suite.projects.includes(entry.slug))
					.map((suite) => (
						<p className="mb-3.5 shrink-0 text-xs" key={suite.slug}>
							Part of{" "}
							<a
								className="relative z-10 text-lime hover:underline"
								href={`/suites/${suite.slug}/`}
							>
								{suite.name}
							</a>
						</p>
					))}

			<CardDescription text={entry.summary} />

			<Authors authors={entry.authors} inline />
		</article>
	);
}
