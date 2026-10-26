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
		<div className="mb-8 overflow-hidden rounded-xl">
			<div className="bg-surface p-5 sm:p-7">
				<Heading className="mb-3 text-sm font-semibold tracking-normal text-muted">
					Summary
				</Heading>

				<p className="mb-0 max-w-[60ch] text-lg font-medium leading-8 text-ink sm:text-xl">
					{summary}
				</p>
			</div>

			<div className="grid gap-3 p-5 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-6 sm:p-7">
				<Heading className="mb-0 text-sm font-semibold leading-7 tracking-normal text-muted">
					Description
				</Heading>

				<p className="mb-0 min-w-0 max-w-[65ch] text-base leading-7 text-ink">
					{description}
				</p>
			</div>
		</div>
	);
}
