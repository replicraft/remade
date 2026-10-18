import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import LauncherDownloads from "../../src/components/launcher/LauncherDownloads";

it("keeps downloads unavailable while allowing manual platform and architecture selection", async () => {
	const screen = await render(<LauncherDownloads />);

	await screen
		.getByRole("combobox", { name: "Platform", exact: true })
		.selectOptions("macos");
	await expect
		.element(
			screen.getByRole("combobox", { name: "Architecture", exact: true }),
		)
		.toHaveValue("universal");
	await screen
		.getByRole("combobox", { name: "Architecture", exact: true })
		.selectOptions("arm64");
	await expect
		.element(screen.getByRole("status"))
		.toHaveTextContent("Downloads are not available yet.");
	await expect
		.element(screen.getByRole("button", { name: "Downloads coming soon" }))
		.toBeDisabled();
	expect(screen.getByRole("link").elements()).toHaveLength(0);
});

it("shows a loading state without offering a download", async () => {
	const screen = await render(
		<LauncherDownloads release={{ status: "loading" }} />,
	);

	await expect
		.element(screen.getByRole("status"))
		.toHaveTextContent("Loading release information");
	await expect
		.element(screen.getByRole("button", { name: "Loading downloads" }))
		.toBeDisabled();
});

it("offers only a matching release asset and explains unsupported selections", async () => {
	const screen = await render(
		<LauncherDownloads
			release={{
				status: "ready",
				version: "test-fixture",
				assets: [
					{
						platform: "macos",
						architecture: "universal",
						name: "fixture.dmg",
						downloadUrl: "https://example.org/fixture.dmg",
					},
				],
			}}
		/>,
	);

	await screen
		.getByRole("combobox", { name: "Platform", exact: true })
		.selectOptions("macos");
	await expect
		.element(screen.getByRole("link", { name: "Download for macOS" }))
		.toHaveAttribute("href", "https://example.org/fixture.dmg");

	await screen
		.getByRole("combobox", { name: "Platform", exact: true })
		.selectOptions("freebsd");
	await expect
		.element(screen.getByRole("status"))
		.toHaveTextContent(
			"No release is available for this platform and architecture.",
		);
	expect(screen.getByRole("link").elements()).toHaveLength(0);
});
