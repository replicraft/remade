import type { Suite } from "../../lib/schemas";

export default function SuiteCard({ suite }: { suite: Suite }) {
	return (
		<article className="relative flex h-full min-h-[280px] flex-col rounded-xl border border-line bg-surface p-[22px] text-sm hover:border-lime/50 focus-within:border-lime sm:p-[26px]">
			<span className="mb-3.5 w-fit rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted">
				Suite
			</span>
			<h3>
				<a
					className="after:absolute after:inset-0 after:rounded-xl"
					href={`/suites/${suite.slug}/`}
				>
					{suite.name}
				</a>
			</h3>
			<p>Includes all {suite.projects.length} projects in this suite.</p>
			<span aria-hidden="true" className="mt-auto pt-5 text-lime">
				View suite →
			</span>
		</article>
	);
}
