import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import AccountSettings from "../../src/components/auth/AccountSettings";
import * as auth from "../../src/lib/auth";

vi.mock("../../src/lib/auth", { spy: true });

const account: auth.Account = {
	id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
	displayName: "Example",
	avatarUrl: null,
	identities: [{ provider: "github", username: "example" }],
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(auth.hasLoginHint).mockReturnValue(true);
	vi.mocked(auth.resolveAccount).mockResolvedValue(account);
	sessionStorage.clear();
	localStorage.clear();
	window.history.replaceState(null, "", "/");
});

describe("account sign-in methods", () => {
	it("shows the current identity and an authenticated POST form for the other provider", async () => {
		const screen = await render(<AccountSettings />);
		await expect
			.element(screen.getByText("Connected as @example"))
			.toBeVisible();
		const connect = screen.getByRole("button", { name: "Connect Discord" });
		await expect.element(connect).toBeVisible();
		expect(connect.element().closest("form")?.method).toBe("post");
		expect(connect.element().closest("form")?.action).toBe(
			`${auth.apiUrl}/auth/discord/link`,
		);
		await expect
			.element(screen.getByRole("button", { name: "Connect GitHub" }))
			.not.toBeInTheDocument();
	});

	it("shows both connected identities without an additional connect action", async () => {
		vi.mocked(auth.resolveAccount).mockResolvedValue({
			...account,
			identities: [
				...account.identities,
				{ provider: "discord", username: "discord.user" },
			],
		});
		window.history.replaceState(null, "", "/?connected=discord");
		const screen = await render(<AccountSettings />);
		await expect
			.element(screen.getByText("Connected as @discord.user"))
			.toBeVisible();
		await expect.element(screen.getByText(/Discord connected/)).toBeVisible();
		await expect
			.element(screen.getByRole("button", { name: /Connect/ }))
			.not.toBeInTheDocument();
	});

	it("does not confirm a connection based only on a query parameter", async () => {
		window.history.replaceState(null, "", "/?connected=discord");
		const screen = await render(<AccountSettings />);
		await expect
			.element(screen.getByRole("button", { name: "Connect Discord" }))
			.toBeVisible();
		await expect
			.element(screen.getByText(/Discord connected/))
			.not.toBeInTheDocument();
	});

	it("does not make an account request or show connect forms for an anonymous visitor", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(false);
		const screen = await render(<AccountSettings />);
		await expect
			.element(
				screen.getByRole("link", { name: "Sign in to manage your account" }),
			)
			.toHaveAttribute("href", "/login/");
		expect(auth.resolveAccount).not.toHaveBeenCalled();
		await expect
			.element(screen.getByRole("button", { name: /Connect/ }))
			.not.toBeInTheDocument();
	});

	it("shows conflict guidance and keeps the current account", async () => {
		window.history.replaceState(null, "", "/?auth_error=identity_in_use");
		const screen = await render(<AccountSettings />);
		await expect
			.element(screen.getByRole("status"))
			.toHaveTextContent(
				"This sign-in method belongs to another Remade account. It cannot be connected to this account.",
			);
		await expect
			.element(screen.getByText("Connected as @example"))
			.toBeVisible();
	});
});
