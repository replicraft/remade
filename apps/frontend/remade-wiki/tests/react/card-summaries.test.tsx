import { expect, inject, it } from "vitest";
import { render } from "vitest-browser-react";
import EntryCard from "../../src/components/catalog/EntryCard";
import RequestCard from "../../src/components/catalog/RequestCard";
import ProjectPage from "../../src/components/pages/ProjectPage";
import SoftwarePage from "../../src/components/pages/SoftwarePage";
import ToolPage from "../../src/components/pages/ToolPage";
import { findBySlug } from "../../src/lib/presentation";

const catalog = inject("catalog");

it.each(["project", "tool"] as const)(
	"shows the %s summary on its card and both summary and description on its page",
	async (kind) => {
		const entry = catalog.entries.find((item) => item.kind === kind);
		if (!entry) throw new Error(`Missing ${kind} fixture`);

		const card = await render(
			<EntryCard
				entry={entry}
				originals={catalog.originals}
				projects={catalog.projects}
			/>,
		);

		await expect
			.element(card.getByText(entry.summary, { exact: true }))
			.toBeVisible();
		await expect
			.element(card.getByText(entry.description, { exact: true }))
			.not.toBeInTheDocument();

		await card.unmount();

		const page = await render(
			entry.kind === "project" ? (
				<ProjectPage catalog={catalog} metadata={{}} project={entry} />
			) : (
				<ToolPage catalog={catalog} metadata={{}} tool={entry} />
			),
		);

		for (const name of ["Summary", "Description"]) {
			await expect
				.element(page.getByRole("heading", { name, level: 2, exact: true }))
				.toBeVisible();
		}

		await expect
			.element(page.getByText(entry.summary, { exact: true }))
			.toBeVisible();

		await expect
			.element(page.getByText(entry.description, { exact: true }))
			.toBeVisible();
	},
);

it("shows a request summary on the card and the full reason on its software page", async () => {
	const request = catalog.requests[0];
	const original = findBySlug(catalog.originals, request.original);
	const card = await render(
		<RequestCard original={original} request={request} />,
	);

	await expect
		.element(card.getByText(request.summary, { exact: true }))
		.toBeVisible();
	await expect
		.element(card.getByText(request.reason, { exact: true }))
		.not.toBeInTheDocument();

	await card.unmount();

	const page = await render(
		<SoftwarePage catalog={catalog} metadata={{}} original={original} />,
	);

	for (const name of ["Summary", "Description"]) {
		await expect
			.element(page.getByRole("heading", { name, level: 3, exact: true }))
			.toBeVisible();
	}

	await expect
		.element(page.getByText(request.summary, { exact: true }))
		.toBeVisible();

	await expect
		.element(page.getByText(request.reason, { exact: true }))
		.toBeVisible();
});
