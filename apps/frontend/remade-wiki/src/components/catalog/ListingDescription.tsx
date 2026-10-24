interface Props {
	summary: string;
	description: string;
	headingLevel?: 2 | 3;
}

export default function ListingDescription({
	summary,
	description,
	headingLevel = 2,
}: Props) {
	const Heading = headingLevel === 3 ? "h3" : "h2";

	return (
		<div className="mb-8 max-w-[72ch] divide-y divide-line rounded-xl border border-line bg-surface">
			<div className="p-5 sm:p-6">
				<Heading className="mb-2 text-base font-semibold tracking-normal text-ink">
					Summary
				</Heading>

				<p className="mb-0 text-base leading-7 text-ink">{summary}</p>
			</div>

			<div className="p-5 sm:p-6">
				<Heading className="mb-2 text-base font-semibold tracking-normal text-ink">
					Description
				</Heading>

				<p className="mb-0 text-sm leading-7 text-muted sm:text-base">
					{description}
				</p>
			</div>
		</div>
	);
}
