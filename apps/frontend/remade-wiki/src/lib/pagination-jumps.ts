export function initializePaginationJumps() {
	document.addEventListener("submit", (event) => {
		const form = event.target;
		if (
			!(form instanceof HTMLFormElement) ||
			!form.hasAttribute("data-pagination-jump")
		)
			return;
		event.preventDefault();
		const input = form.querySelector("input");
		if (!input || !form.reportValidity()) return;
		const page = input.valueAsNumber;
		if (!Number.isSafeInteger(page) || page < 1 || page > Number(input.max))
			return;
		const link = form
			.closest("[data-pagination-nav]")
			?.querySelector<HTMLAnchorElement>(`[data-pagination-page="${page}"]`);
		if (!link?.hasAttribute("href")) return;
		const details = form.closest("details");
		if (details) details.open = false;
		link.click();
	});

	document.addEventListener(
		"toggle",
		(event) => {
			const details = event.target;
			if (
				!(details instanceof HTMLDetailsElement) ||
				!details.hasAttribute("data-pagination-gap") ||
				!details.open
			)
				return;
			for (const other of document.querySelectorAll<HTMLDetailsElement>(
				"[data-pagination-gap][open]",
			)) {
				if (other !== details) other.open = false;
			}
			const form = details.querySelector("form");
			if (form) {
				form.style.marginLeft = "0px";
				const bounds = form.getBoundingClientRect();
				const shift = Math.max(
					8 - bounds.left,
					Math.min(0, innerWidth - 8 - bounds.right),
				);
				form.style.marginLeft = `${shift}px`;
			}
			details.querySelector("input")?.focus();
		},
		true,
	);

	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape") return;
		for (const details of document.querySelectorAll<HTMLDetailsElement>(
			"[data-pagination-gap][open]",
		)) {
			details.open = false;
			details.querySelector("summary")?.focus();
		}
	});

	document.addEventListener("click", (event) => {
		for (const details of document.querySelectorAll<HTMLDetailsElement>(
			"[data-pagination-gap][open]",
		)) {
			if (event.target instanceof Node && !details.contains(event.target))
				details.open = false;
		}
	});
}
