import { paginationRange, paginationWindow } from "./pagination";

export function initializePaginatedLists() {
	const renderers: (() => void)[] = [];

	for (const root of document.querySelectorAll<HTMLElement>(
		"[data-pagination-root]",
	)) {
		const container = root.querySelector<HTMLElement>(
			":scope > [data-pagination-items]",
		);
		const controls = root.querySelector<HTMLElement>(
			":scope > [data-pagination-controls]",
		);
		if (!container || !controls) continue;

		const items = [...container.children].filter(
			(item): item is HTMLElement => item instanceof HTMLElement,
		);
		const size = Number(root.dataset.paginationSize);
		if (!Number.isInteger(size) || size < 1) continue;
		const links = [
			...controls.querySelectorAll<HTMLAnchorElement>("[data-pagination-page]"),
		];
		const status = controls.querySelector<HTMLElement>(
			"[data-pagination-status]",
		);
		let current = 1;

		const href = (page: number) => {
			const url = new URL(location.href);
			if (page === 1) url.searchParams.delete(root.id);
			else url.searchParams.set(root.id, String(page));
			url.hash = root.id;
			return `${url.pathname}${url.search}${url.hash}`;
		};

		const render = () => {
			const matches = items.filter(
				(item) => item.dataset.paginationFiltered !== "true",
			);
			const requested = Number(
				new URLSearchParams(location.search).get(root.id) ?? 1,
			);
			const range = paginationRange(matches.length, size, requested);
			const { pages, start, end } = range;
			current = range.current;
			const window = paginationWindow(current, pages);
			const visible = new Set(matches.slice(start, end));
			for (const item of items) item.hidden = !visible.has(item);
			controls.hidden = pages <= 1;

			for (const link of links) {
				const key = link.dataset.paginationPage;
				const page =
					key === "prev"
						? current - 1
						: key === "next"
							? current + 1
							: Number(key);
				const disabled = page < 1 || page > pages;
				link.hidden =
					key !== "prev" && key !== "next" && !window.includes(page);
				if (disabled) {
					link.removeAttribute("href");
					link.setAttribute("aria-disabled", "true");
					link.setAttribute("role", "link");
					link.tabIndex = -1;
				} else {
					link.href = href(page);
					link.removeAttribute("aria-disabled");
					link.removeAttribute("role");
					link.removeAttribute("tabindex");
				}
				if (key !== "prev" && key !== "next" && page === current)
					link.setAttribute("aria-current", "page");
				else link.removeAttribute("aria-current");
			}
			for (const gap of controls.querySelectorAll<HTMLDetailsElement>(
				"[data-pagination-gap]",
			)) {
				gap.open = false;
				gap.hidden =
					pages <= 7 ||
					(gap.dataset.paginationGap === "gap-start"
						? window[1] === 2
						: window.at(-2) === pages - 1);
				const input = gap.querySelector("input");
				if (input) {
					input.max = String(pages);
					input.placeholder = `1–${pages}`;
				}
			}
			if (status)
				status.textContent = `Page ${current} of ${pages} · ${matches.length} results`;
		};

		controls.addEventListener("click", (event) => {
			const link =
				event.target instanceof Element
					? event.target.closest<HTMLAnchorElement>("[data-pagination-page]")
					: null;
			if (
				!link ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			)
				return;
			event.preventDefault();
			if (link.getAttribute("aria-disabled") === "true") return;
			const key = link.dataset.paginationPage;
			const page =
				key === "prev"
					? current - 1
					: key === "next"
						? current + 1
						: Number(key);
			history.pushState(null, "", href(page));
			for (const update of renderers) update();
			root.scrollIntoView({ block: "start" });
			root.focus({ preventScroll: true });
		});
		root.addEventListener("pagination-filter", () => {
			const url = new URL(location.href);
			url.searchParams.delete(root.id);
			history.replaceState(null, "", url);
			for (const update of renderers) update();
		});
		render();
		renderers.push(render);
	}

	window.addEventListener("popstate", () => {
		for (const render of renderers) render();
	});
}
