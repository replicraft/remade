import type { ReactNode } from "react";
import type { Original, Request } from "../../lib/schemas";
import CardDescription from "./CardDescription";

interface Props {
	request: Request;
	original: Original;
	actions?: ReactNode;
}

export default function RequestCard({ request, original, actions }: Props) {
	return (
		<article className="relative isolate flex h-full min-h-[360px] min-w-0 flex-col rounded-xl border border-line bg-surface p-[22px] text-sm hover:border-lime/50 focus-within:border-lime sm:p-[26px]">
			<div className="mb-3.5 flex shrink-0 flex-wrap gap-2">
				<span className="rounded border border-line bg-panel px-2 py-0.5 text-xs text-muted">
					Project Request
				</span>
			</div>

			<h3 className="shrink-0">
				<a
					className="after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-lime"
					href={`/software/${original.slug}/`}
				>
					{original.name} ↗
				</a>
			</h3>

			<CardDescription
				href={`/software/${original.slug}/`}
				label={`Read more about the ${original.name} request`}
				text={request.reason}
			/>

			<div className="mt-auto shrink-0">
				{request.suggested_names && (
					<p className="mb-0 pt-2">
						Suggested name:{" "}
						<span className="text-lime">
							{request.suggested_names.join(", ")}
						</span>
					</p>
				)}

				{actions}
			</div>
		</article>
	);
}
