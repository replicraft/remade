import { paginationWindow } from "../../lib/pagination";

type Props = {
	currentPage: number;
	totalPages: number;
	hrefForPage: (page: number) => string;
	label?: string;
};

export default function PaginationControls({
	currentPage,
	totalPages,
	hrefForPage,
	label = "Pagination",
}: Props) {
	const pages = Math.max(1, totalPages);
	const current = Math.max(1, Math.min(currentPage, pages));
	const visible = paginationWindow(current, pages);
	const links = [
		{ key: "prev", page: current - 1, text: "← Prev" },
		...Array.from({ length: pages }, (_, index) => index + 1).flatMap(
			(page) => [
				...(page === pages && pages > 1
					? [{ key: "gap-end", page: 0, text: "…" }]
					: []),
				{ key: String(page), page, text: String(page) },
				...(page === 1 && pages > 1
					? [{ key: "gap-start", page: 0, text: "…" }]
					: []),
			],
		),
		{ key: "next", page: current + 1, text: "Next →" },
	];

	return (
		<nav
			aria-label={label}
			className="my-8 flex flex-wrap items-center justify-center gap-2"
			data-pagefind-ignore
			data-pagination-nav
		>
			{links.map(({ key, page, text }) => {
				if (key === "gap-start" || key === "gap-end") {
					const hidden =
						key === "gap-start"
							? visible[1] === 2
							: visible.at(-2) === pages - 1;
					return (
						<details
							className="relative [&[hidden]]:hidden"
							data-pagination-gap={key}
							hidden={hidden}
							key={key}
						>
							<summary
								aria-label={
									key === "gap-start"
										? "Jump to an earlier page"
										: "Jump to a later page"
								}
								className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-line px-3 text-sm hover:text-lime [&::-webkit-details-marker]:hidden"
							>
								…
							</summary>
							<form
								className="absolute bottom-full left-1/2 z-20 mb-2 flex w-56 -translate-x-1/2 items-end gap-2 rounded-lg border border-line bg-surface p-3 shadow-lg"
								data-pagination-jump
							>
								<label className="min-w-0 flex-1 text-xs font-semibold">
									Page number
									<input
										className="mt-1 w-full"
										max={pages}
										min={1}
										name="page"
										placeholder={`1–${pages}`}
										required
										step={1}
										type="number"
									/>
								</label>
								<button
									className="action-secondary !min-h-11 !px-3 !py-2"
									type="submit"
								>
									Go
								</button>
							</form>
						</details>
					);
				}
				const disabled = page < 1 || page > pages;
				const active = key !== "prev" && key !== "next" && page === current;

				return (
					<a
						aria-current={active ? "page" : undefined}
						aria-disabled={disabled || undefined}
						className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3 text-sm aria-[current=page]:border-lime aria-[current=page]:text-lime aria-disabled:cursor-default aria-disabled:opacity-50 [&[hidden]]:hidden"
						data-pagination-page={key}
						hidden={key !== "prev" && key !== "next" && !visible.includes(page)}
						href={disabled ? undefined : hrefForPage(page)}
						key={key}
						rel={key === "prev" || key === "next" ? key : undefined}
						role={disabled ? "link" : undefined}
						tabIndex={disabled ? -1 : undefined}
					>
						{text}
					</a>
				);
			})}
			<noscript>
				<style>{`[data-pagination-nav] [data-pagination-page][hidden]{display:inline-flex!important}[data-pagination-nav] [data-pagination-gap]{display:none!important}`}</style>
			</noscript>
		</nav>
	);
}
