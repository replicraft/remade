interface Props {
	authors?: string[];
	inline?: boolean;
}

export default function Authors({ authors = [], inline = false }: Props) {
	return (
		<>
			{authors.length > 0 && (
				<div
					className={`mt-auto flex shrink-0 gap-1 pt-[18px] text-sm ${inline ? "flex-wrap items-baseline gap-x-2" : "flex-col"}`}
					data-pagefind-ignore
				>
					<p className={`${inline ? "mb-0" : ""} font-semibold text-ink`}>
						{authors.length === 1 ? "Author:" : "Authors:"}
					</p>

					<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
						{authors.map((author) => (
							<span className="inline-flex items-baseline gap-2" key={author}>
								<a
									className="relative z-10 whitespace-nowrap text-lime hover:underline focus-visible:underline"
									href={`/authors/${author}/`}
								>
									@{author} ↗
								</a>
							</span>
						))}
					</div>
				</div>
			)}
		</>
	);
}
