interface Props {
	text: string;
	href: string;
	label: string;
	fillSpace?: boolean;
}

export default function CardDescription({
	text,
	href,
	label,
	fillSpace = true,
}: Props) {
	return (
		<div
			className={`mb-4 max-h-[172px] min-h-0 overflow-hidden ${fillSpace ? "flex-1" : "flex-none"}`}
			data-card-description
		>
			<p className="mb-0 overflow-hidden leading-6" data-card-text>
				{text}
			</p>

			<a
				aria-label={label}
				className="relative z-10 mt-2 w-fit text-xs text-muted hover:text-lime hover:underline"
				data-card-read-more
				hidden
				href={href}
			>
				Read more…
			</a>
		</div>
	);
}
