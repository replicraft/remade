interface Props {
	text: string;
	fillSpace?: boolean;
}

export default function CardDescription({ text, fillSpace = true }: Props) {
	return (
		<p
			className={`mb-4 leading-6 ${fillSpace ? "flex-1" : "flex-none"}`}
			data-card-summary
		>
			{text}
		</p>
	);
}
