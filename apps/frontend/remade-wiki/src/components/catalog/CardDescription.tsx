interface Props {
	text: string;
}

export default function CardDescription({ text }: Props) {
	return (
		<p className="mb-4 flex-1 leading-6" data-card-summary>
			{text}
		</p>
	);
}
