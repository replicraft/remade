import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PaginatedList from "../../src/components/navigation/PaginatedList";
import PaginationControls from "../../src/components/navigation/PaginationControls";
import { paginationRange, paginationWindow } from "../../src/lib/pagination";

describe("pagination bounds", () => {
	it("keeps empty and single-page results on page one", () => {
		expect(paginationRange(0, 24, 4)).toEqual({
			current: 1,
			pages: 1,
			start: 0,
			end: 24,
		});
		expect(paginationRange(24, 24, 2).current).toBe(1);
	});

	it("clamps a page after filtering and includes a partial last page", () => {
		expect(paginationRange(49, 24, 99)).toEqual({
			current: 3,
			pages: 3,
			start: 48,
			end: 72,
		});
	});

	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
		"handles invalid page %s",
		(page) => {
			expect(paginationRange(100, 24, page).current).toBe(1);
		},
	);
});

describe("compact page windows", () => {
	it("keeps short ranges complete", () => {
		expect(paginationWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it("keeps the first, last and nearby pages", () => {
		expect(paginationWindow(1, 20)).toEqual([1, 2, 3, 4, 5, 20]);
		expect(paginationWindow(10, 20)).toEqual([1, 9, 10, 11, 20]);
		expect(paginationWindow(20, 20)).toEqual([1, 16, 17, 18, 19, 20]);
	});

	it("renders jump fields with bounded integer input and retains hidden page links", () => {
		const html = renderToStaticMarkup(
			createElement(PaginationControls, {
				currentPage: 10,
				totalPages: 20,
				hrefForPage: (page) => `/requests/page/${page}/`,
			}),
		);
		expect(html).toContain('aria-label="Jump to an earlier page"');
		expect(html).toContain('aria-label="Jump to a later page"');
		expect(html).toContain('min="1"');
		expect(html).toContain('max="20"');
		expect(html).toContain('step="1"');
		expect(html).toContain(
			'data-pagination-page="15" hidden="" href="/requests/page/15/"',
		);
	});
});

describe("static pagination", () => {
	it("preserves filter URLs on numbered and adjacent-page links", () => {
		const html = renderToStaticMarkup(
			createElement(PaginationControls, {
				currentPage: 2,
				totalPages: 3,
				hrefForPage: (page) => `/explore/page/${page}/?category=creative`,
			}),
		);
		expect(html).toContain('href="/explore/page/1/?category=creative"');
		expect(html).toContain('href="/explore/page/3/?category=creative"');
		expect(html).toContain('rel="prev"');
		expect(html).toContain('rel="next"');
		expect(html).toContain('aria-current="page"');
	});

	it("disables both directions for a single page", () => {
		const html = renderToStaticMarkup(
			createElement(PaginationControls, {
				currentPage: 1,
				totalPages: 1,
				hrefForPage: () => "/explore/",
			}),
		);
		expect(html.match(/aria-disabled="true"/g)).toHaveLength(2);
		expect(html.match(/href=/g)).toHaveLength(1);
	});

	it("keeps every item available without JavaScript and hides enhancement-only controls", () => {
		const html = renderToStaticMarkup(
			createElement(
				PaginatedList,
				{
					id: "example-list",
					label: "Examples",
					className: "grid",
				},
				Array.from({ length: 25 }, (_, i) =>
					createElement("article", { key: i }, `Item ${i + 1}`),
				),
			),
		);
		expect(html.match(/<article>/g)).toHaveLength(25);
		expect(html).toContain('data-pagination-controls="" hidden=""');
		expect(html).toContain('aria-label="Examples pagination"');
	});
});
