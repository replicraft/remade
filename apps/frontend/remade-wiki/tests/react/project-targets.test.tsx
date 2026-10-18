import { describe, expect, inject, it } from "vitest";
import { render } from "vitest-browser-react";
import EntryCard from "../../src/components/catalog/EntryCard";
import ProjectPage from "../../src/components/pages/ProjectPage";
import SoftwarePage from "../../src/components/pages/SoftwarePage";
import { findBySlug } from "../../src/lib/presentation";

const catalog = inject("catalog");
const project = findBySlug(catalog.projects, "plane");
const entry = findBySlug(catalog.entries, "plane");

describe("multi-target project links", () => {
	it("links every target from the project card", async () => {
		const screen = await render(
			<EntryCard
				entry={entry}
				originals={catalog.originals}
				projects={catalog.projects}
			/>,
		);

		for (const slug of project.originals) {
			const target = findBySlug(catalog.originals, slug);

			await expect
				.element(screen.getByRole("link", { name: target.name, exact: true }))
				.toHaveAttribute("href", `/software/${slug}/`);
		}
	});

	it("links every target from the project page", async () => {
		const screen = await render(
			<ProjectPage catalog={catalog} metadata={{}} project={project} />,
		);

		for (const slug of project.originals) {
			const target = findBySlug(catalog.originals, slug);

			await expect
				.element(screen.getByRole("link", { name: target.name, exact: true }))
				.toHaveAttribute("href", `/software/${slug}/`);
		}
	});

	it.each(project.originals)(
		"lists Plane on the %s software page",
		async (slug) => {
			const screen = await render(
				<SoftwarePage
					catalog={catalog}
					metadata={{}}
					original={findBySlug(catalog.originals, slug)}
				/>,
			);

			await expect
				.element(screen.getByRole("link", { name: "Plane", exact: true }))
				.toHaveAttribute("href", "/projects/plane/");
		},
	);
});
