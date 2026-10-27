import { beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import LoginButton from "../../src/components/auth/LoginButton";
import LoginOptions from "../../src/components/auth/LoginOptions";
import { apiUrl } from "../../src/lib/auth";
import { announceLogin } from "../../src/lib/auth-notifications";

beforeEach(() => {
	localStorage.removeItem("remade-last-login-provider");
	sessionStorage.removeItem("remade-pending-login-toast");
});

describe("login dropdown", () => {
	it("opens the ordered provider links with logos and dismisses with Escape", async () => {
		const screen = await render(<LoginButton discordEnabled />);
		const trigger = screen.getByRole("button", { name: "Login", exact: true });
		await expect
			.element(screen.getByRole("link", { name: "Continue with GitHub" }))
			.not.toBeInTheDocument();
		trigger.element().focus();
		await userEvent.keyboard("{Enter}");
		const github = screen.getByRole("link", { name: "Continue with GitHub" });
		const discord = screen.getByRole("link", { name: "Continue with Discord" });
		await expect.element(github).toBeVisible();
		await expect
			.element(discord)
			.toHaveAttribute("href", `${apiUrl}/auth/discord`);
		expect(github.element().querySelector("svg")).not.toBeNull();
		expect(discord.element().querySelector("svg")).not.toBeNull();
		expect(
			github.element().compareDocumentPosition(discord.element()) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		await userEvent.keyboard("{Tab}{Escape}");
		await expect.element(github).not.toBeInTheDocument();
		await expect.element(trigger).toHaveFocus();
	});

	it("dismisses when clicking outside", async () => {
		const screen = await render(
			<>
				<button type="button">Outside</button>
				<LoginButton discordEnabled />
			</>,
		);
		await screen.getByRole("button", { name: "Login", exact: true }).click();
		await screen.getByRole("button", { name: "Outside" }).click();
		await expect
			.element(screen.getByRole("link", { name: "Continue with Discord" }))
			.not.toBeInTheDocument();
	});

	it("remembers a confirmed provider across logout and page visits", async () => {
		announceLogin({
			id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
			displayName: null,
			avatarUrl: null,
			identities: [{ provider: "discord", username: "example" }],
		});
		const screen = await render(<LoginButton discordEnabled />);
		await screen.getByRole("button", { name: "Login", exact: true }).click();
		await expect
			.element(
				screen.getByRole("link", { name: "Continue with Discord Last used" }),
			)
			.toBeVisible();
		await expect
			.element(
				screen.getByRole("link", { name: "Continue with GitHub", exact: true }),
			)
			.toBeVisible();
		await screen.unmount();
		const page = await render(<LoginOptions discordEnabled />);
		await expect
			.element(
				page.getByRole("link", { name: "Continue with Discord Last used" }),
			)
			.toBeVisible();
	});

	it("does not offer Discord before it is enabled", async () => {
		const screen = await render(<LoginButton discordEnabled={false} />);
		await screen.getByRole("button", { name: "Login", exact: true }).click();
		await expect
			.element(screen.getByRole("link", { name: "Continue with Discord" }))
			.not.toBeInTheDocument();
		await expect.element(screen.getByText("Last used")).not.toBeInTheDocument();
	});
});
