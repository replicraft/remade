export function paginationRange(
	total: number,
	size: number,
	requested: number,
) {
	const pages = Math.max(1, Math.ceil(total / size));
	const current = Number.isSafeInteger(requested)
		? Math.max(1, Math.min(requested, pages))
		: 1;
	const start = (current - 1) * size;

	return { current, pages, start, end: start + size };
}

export function paginationWindow(current: number, pages: number) {
	if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
	const start = current <= 4 ? 2 : Math.min(current - 1, pages - 4);
	const end = current >= pages - 3 ? pages - 1 : Math.max(current + 1, 5);
	const visible = new Set([1, pages]);
	for (let page = start; page <= end; page++) visible.add(page);
	return [...visible].sort((a, b) => a - b);
}
