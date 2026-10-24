interface Props {
	summary: string;
	description: string;
}

export default function ListingDescription({ summary, description }: Props) {
	return (
		<div className="mb-8 max-w-[72ch] space-y-4">
			<p className="mb-0 text-lg font-medium leading-relaxed text-ink sm:text-xl">
				{summary}
			</p>

			<p className="mb-0 text-sm leading-7 text-muted sm:text-base">
				{description}
			</p>
		</div>
	);
}
