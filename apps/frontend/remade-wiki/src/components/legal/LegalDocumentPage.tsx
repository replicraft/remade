import type { ReactNode } from "react";
import type { LegalDocument } from "../../lib/legal";

type Heading = { depth: number; slug: string; text: string };

export default function LegalDocumentPage({
	document,
	headings,
	unresolved,
	children,
}: {
	document: LegalDocument;
	headings: Heading[];
	unresolved: string[];
	children: ReactNode;
}) {
	const draft = document.status === "draft";
	return (
		<div className="legal-document pt-12 sm:pt-16">
			{draft && (
				<aside
					aria-label="Unpublished legal draft"
					className="legal-draft-notice mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm"
				>
					<p className="mb-0 text-muted">Draft preview · Not published</p>
					<a className="text-lime underline" href="/legal-preview/">
						Review status →
					</a>
					{unresolved.length > 0 && (
						<details className="w-full">
							<summary className="cursor-pointer">
								{unresolved.length} unresolved publication fields
							</summary>
							<ul className="mt-3 list-disc pl-5">
								{unresolved.map((field) => (
									<li className="break-words" key={field}>
										{field}
									</li>
								))}
							</ul>
						</details>
					)}
				</aside>
			)}
			<div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
				<nav
					aria-label={`${document.title} contents`}
					className="legal-contents rounded-lg bg-surface p-5 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto"
				>
					<h2 className="!mt-0 !text-base">Contents</h2>
					<ol className="space-y-2 text-sm">
						{headings
							.filter((heading) => heading.depth === 2)
							.map((heading) => (
								<li key={heading.slug}>
									<a
										className="text-muted hover:text-lime"
										href={`#${heading.slug}`}
									>
										{heading.text}
									</a>
								</li>
							))}
					</ol>
				</nav>
				<article className="legal-prose min-w-0 max-w-[800px] [&_h2]:mt-10 [&_h3]:mt-7 [&_a]:break-words [&_a]:text-lime [&_a]:underline [&_li]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-lime [&_blockquote]:pl-4 [&_table]:my-6 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:border-line [&_td]:p-3 [&_th]:border [&_th]:border-line [&_th]:p-3 [&_th]:text-left">
					{children}
				</article>
			</div>
		</div>
	);
}
