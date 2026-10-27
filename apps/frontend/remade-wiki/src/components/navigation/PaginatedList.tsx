import { Children, type ReactNode } from "react";
import { pageSize } from "../../lib/directory";
import PaginationControls from "./PaginationControls";

export default function PaginatedList({
	children,
	id,
	label,
	className,
	as: Tag = "div",
}: {
	children?: ReactNode;
	id: string;
	label: string;
	className: string;
	as?: "div" | "ul";
}) {
	const pages = Math.max(1, Math.ceil(Children.count(children) / pageSize));

	return (
		<div
			data-pagination-root
			data-pagination-size={pageSize}
			id={id}
			tabIndex={-1}
		>
			<Tag className={`${className} [&>[hidden]]:hidden`} data-pagination-items>
				{children}
			</Tag>
			{pages > 1 && (
				<div data-pagination-controls hidden>
					<PaginationControls
						currentPage={1}
						hrefForPage={(page) =>
							`?${new URLSearchParams({ [id]: String(page) })}#${id}`
						}
						label={`${label} pagination`}
						totalPages={pages}
					/>
					<p
						className="text-center text-sm text-muted"
						data-pagination-status
						role="status"
					/>
				</div>
			)}
		</div>
	);
}
