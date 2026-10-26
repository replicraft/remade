import { describe, expect, inject, it } from "vitest";
import { render } from "vitest-browser-react";
import EntryCard from "../../src/components/catalog/EntryCard";
import RepositoryMirrors from "../../src/components/catalog/RepositoryMirrors";
import SuitePage from "../../src/components/pages/SuitePage";
import ToolPage from "../../src/components/pages/ToolPage";
import { findBySlug } from "../../src/lib/presentation";

const catalog = inject("catalog");
const tool = findBySlug(catalog.tools, "lazymaplayers-effectcraft");
const entry = findBySlug(
	catalog.entries.filter((entry) => entry.kind === "tool"),
	tool.slug,
);

describe("supporting tools", () => {
	it("shows the TypeScript badge and a linked Tool for target", async () => {
		const screen = await render(
			<EntryCard
				entry={entry}
				originals={catalog.originals}
				projects={catalog.projects}
			/>,
		);

		await expect
			.element(screen.getByText("Tool", { exact: true }))
			.toBeVisible();

		await expect
			.element(screen.getByText("Alpha", { exact: true }))
			.toBeVisible();

		await expect
			.element(screen.getByText("TypeScript", { exact: true }))
			.toBeVisible();

		await expect
			.element(screen.getByText("JavaScript", { exact: true }))
			.not.toBeInTheDocument();

		await expect
			.element(screen.getByText("Creative", { exact: true }))
			.not.toBeInTheDocument();

		await expect
			.element(screen.getByRole("link", { name: "EffectCraft", exact: true }))
			.toHaveAttribute("href", "/projects/effectcraft/");

		await expect.element(screen.getByText(/Tool for/)).toBeVisible();
	});

	it("omits the status badge when maturity is undocumented", async () => {
		const screen = await render(
			<EntryCard
				entry={{ ...entry, status: undefined }}
				originals={catalog.originals}
				projects={catalog.projects}
			/>,
		);

		await expect
			.element(screen.getByText("Tool", { exact: true }))
			.toBeVisible();

		await expect
			.element(screen.getByText("Status not documented", { exact: true }))
			.not.toBeInTheDocument();

		await expect
			.element(screen.getByText("Alpha", { exact: true }))
			.not.toBeInTheDocument();
	});

	it("keeps both languages in details and puts Works with before details", async () => {
		const screen = await render(
			<ToolPage catalog={catalog} metadata={{}} tool={tool} />,
		);

		await expect
			.element(screen.getByText("JavaScript, TypeScript", { exact: true }))
			.toBeVisible();

		await expect
			.element(screen.getByText("MIT", { exact: true }))
			.toBeVisible();

		await expect
			.element(screen.getByText(tool.limitations ?? "", { exact: true }))
			.toBeVisible();

		expect(
			screen
				.getByRole("heading", { name: "Works with", exact: true })
				.element()
				.compareDocumentPosition(
					screen.getByRole("heading", { name: "Details and scope" }).element(),
				) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});

describe("repository mirrors", () => {
	it("shows the empty state without an accordion", async () => {
		const screen = await render(<RepositoryMirrors />);

		await expect.element(screen.getByText(/No mirrors found/)).toBeVisible();

		await expect
			.element(screen.getByText("View Mirrors", { exact: true }))
			.not.toBeInTheDocument();

		await expect
			.element(screen.getByRole("link", { name: "Contribute a mirror link ↗" }))
			.toBeVisible();
	});

	it("expands and collapses mirror links", async () => {
		const screen = await render(
			<RepositoryMirrors mirrors={["https://codeberg.org/example/project"]} />,
		);
		const link = screen.getByRole("link", {
			name: "codeberg.org/example/project ↗",
			includeHidden: true,
		});

		await expect.element(link).not.toBeVisible();

		await screen.getByText("View Mirrors", { exact: true }).click();

		await expect.element(link).toBeVisible();

		await expect.element(link).toHaveAttribute("target", "_blank");

		await screen.getByText("View Mirrors", { exact: true }).click();

		await expect.element(link).not.toBeVisible();
	});
});

describe("suite browsing", () => {
	it("links a tool card to its suite without enumerating its members", async () => {
		const launcher = findBySlug(catalog.entries, "artcraft-launcher");
		const screen = await render(
			<EntryCard
				entry={launcher}
				originals={catalog.originals}
				projects={catalog.projects}
				suites={catalog.suites}
			/>,
		);

		await expect
			.element(
				screen.getByRole("link", { name: "ArtCraft Suite", exact: true }),
			)
			.toHaveAttribute("href", "/suites/artcraft/");
		await expect
			.element(screen.getByRole("link", { name: "PhotoCraft", exact: true }))
			.not.toBeInTheDocument();
	});

	it("shows every suite product as a linked card", async () => {
		const suite = findBySlug(catalog.suites, "artcraft");
		const screen = await render(
			<SuitePage catalog={catalog} metadata={{}} suite={suite} />,
		);

		await expect
			.element(
				screen.getByRole("heading", { name: "ArtCraft Suite", exact: true }),
			)
			.toBeVisible();

		for (const slug of suite.projects) {
			const project = findBySlug(catalog.projects, slug);

			await expect
				.element(
					screen.getByRole("link", { name: `${project.name}`, exact: true }),
				)
				.toHaveAttribute("href", `/projects/${slug}/`);
		}
	});
});
