import type { ReactNode } from "react";
import type { DirectoryRecord } from "../../lib/directory";
import {
	badgeLanguages,
	formatStars,
	label,
	relativeDate,
	shortDate,
} from "../../lib/presentation";
import Authors from "./Authors";
import CardDescription from "./CardDescription";

export default function DirectoryCard({
	record,
	actions,
}: {
	record: DirectoryRecord;
	actions?: ReactNode;
}) {
	return (
		<article className="directory-card">
			<div className="flex flex-wrap gap-2 text-xs text-muted">
				<span className="rounded border border-line bg-panel px-2 py-0.5">
					{record.kind === "request"
						? "Project Request"
						: record.kind === "tool"
							? "Tool"
							: label(record.status)}
				</span>
				{record.kind === "tool" && record.status && (
					<span className="rounded border border-line bg-panel px-2 py-0.5">
						{label(record.status)}
					</span>
				)}
				{record.languages.length > 0 && (
					<span className="rounded border border-line bg-panel px-2 py-0.5">
						{badgeLanguages(record.languages).join(" · ")}
					</span>
				)}
				{record.stars !== null && (
					<a
						className="rounded border border-line bg-panel px-2 py-0.5"
						href={record.href}
						title={`${record.stars.toLocaleString("en")} GitHub stars${record.fetchedAt ? ` · Last successful update: ${relativeDate(record.fetchedAt)} (${shortDate(record.fetchedAt)})` : ""}`}
					>
						★ {formatStars(record.stars)}
					</a>
				)}
			</div>
			<h3>
				<a
					className="card-main-link after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-lime"
					href={record.href}
				>
					{record.name}
				</a>
			</h3>
			{record.kind === "project" && (
				<p className="!mb-3 text-xs">
					Replaces:{" "}
					{record.originals?.map((original, index) => (
						<span key={original.href}>
							{index > 0 && ", "}
							<a className="text-lime hover:underline" href={original.href}>
								{original.name}
							</a>
						</span>
					)) ?? record.target}
				</p>
			)}

			{record.suites.length > 0 && (
				<p className="!mb-3 text-xs">
					{record.kind === "tool" ? "Tool for" : "Part of"}{" "}
					{record.suites.map((suite, index) => (
						<span key={suite.href}>
							{index > 0 && ", "}
							<a href={suite.href}>{suite.name}</a>
						</span>
					))}
				</p>
			)}
			{record.kind === "tool" && record.targets.length > 0 && (
				<p className="!mb-3 text-xs">
					{record.suites.length ? "Also supports" : "Tool for"}{" "}
					{record.targets.map((target, index) => (
						<span key={target.href}>
							{index > 0 && ", "}
							<a href={target.href}>{target.name}</a>
						</span>
					))}
				</p>
			)}
			<CardDescription fillSpace={false} text={record.summary} />

			{record.suggestedNames?.length ? (
				<p className="mb-3 shrink-0 pt-2">
					Suggested name:{" "}
					<span className="text-lime">{record.suggestedNames.join(", ")}</span>
				</p>
			) : null}
			<Authors authors={record.authors} inline />
			{actions && <div className="mt-auto">{actions}</div>}
		</article>
	);
}
