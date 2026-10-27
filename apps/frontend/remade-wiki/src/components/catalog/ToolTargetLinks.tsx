interface Props {
	links: { name: string; href: string }[];
}

export default function ToolTargetLinks({ links }: Props) {
	if (links.length <= 3) {
		return links.map((link, index) => (
			<span key={link.href}>
				{index > 0 && ", "}
				<a className="relative z-10 text-lime hover:underline" href={link.href}>
					{link.name}
				</a>
			</span>
		));
	}

	return (
		<details className="inline" data-tool-targets>
			<summary className="relative z-10 inline cursor-pointer list-none text-lime hover:underline [&::-webkit-details-marker]:hidden">
				View List
			</summary>
			<div
				className="absolute left-0 top-full z-20 w-full max-w-sm pt-2"
				data-tool-target-panel
			>
				<div className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-panel p-2 shadow-xl">
					<ul aria-label="Supported projects" className="grid gap-1">
						{links.map((link) => (
							<li key={link.href}>
								<a
									className="block rounded-md px-3 py-2 text-sm text-lime hover:bg-surface hover:underline"
									href={link.href}
								>
									{link.name}
								</a>
							</li>
						))}
					</ul>
				</div>
			</div>
		</details>
	);
}
