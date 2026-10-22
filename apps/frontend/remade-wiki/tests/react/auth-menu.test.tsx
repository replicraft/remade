import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import AuthMenu from "../../src/components/auth/AuthMenu";
import * as auth from "../../src/lib/auth";

vi.mock("../../src/lib/auth", { spy: true });
vi.mock("sonner", { spy: true });

const account: auth.Account = {
	id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
	displayName: "Example User",
	avatarUrl: "https://avatars.githubusercontent.com/u/123",
	identities: [{ provider: "github", username: "example" }],
};

beforeEach(() => {
	vi.clearAllMocks();
	sessionStorage.removeItem("remade-pending-login-toast");
	toast.dismiss();
	vi.mocked(auth.hasLoginHint).mockReturnValue(false);
	vi.mocked(auth.resolveAccount).mockResolvedValue(account);
	vi.mocked(auth.logout).mockResolvedValue();
});

describe("header authentication", () => {
	it("shows Login without making an anonymous session request", async () => {
		const screen = await render(<AuthMenu />);
		await expect
			.element(screen.getByRole("link", { name: "Login" }))
			.toHaveAttribute("href", auth.loginUrl);
		expect(auth.resolveAccount).not.toHaveBeenCalled();
	});

	it("shows a returning account and logs out through its menu", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		const screen = await render(<AuthMenu />);
		await screen
			.getByRole("combobox", { name: "Account menu for Example User" })
			.click();
		await expect
			.element(screen.getByText("Example User", { exact: true }))
			.toBeVisible();
		await screen.getByText("Logout", { exact: true }).click();
		await expect
			.element(screen.getByRole("link", { name: "Login" }))
			.toBeVisible();
		expect(toast.success).toHaveBeenCalledWith("Logged out");
		expect(toast.success).not.toHaveBeenCalledWith("Logged in as example");
		expect(auth.logout).toHaveBeenCalledOnce();
		expect(auth.resolveAccount).toHaveBeenCalledOnce();
	});

	it("announces a confirmed OAuth return using the GitHub username only once", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		sessionStorage.setItem("remade-pending-login-toast", String(Date.now()));

		const screen = await render(<AuthMenu />);
		await expect
			.poll(() => vi.mocked(toast.success).mock.calls)
			.toEqual([["Logged in as example"]]);
		expect(sessionStorage.getItem("remade-pending-login-toast")).toBeNull();

		await screen.unmount();
		await render(<AuthMenu />);
		await expect.poll(() => auth.resolveAccount).toHaveBeenCalledTimes(2);
		expect(toast.success).toHaveBeenCalledOnce();
	});

	it("shows a Discord username and announces a confirmed Discord sign-in", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		vi.mocked(auth.resolveAccount).mockResolvedValue({
			...account,
			displayName: null,
			identities: [{ provider: "discord", username: "discord.user" }],
		});
		sessionStorage.setItem("remade-pending-login-toast", String(Date.now()));
		const screen = await render(<AuthMenu />);
		await expect
			.element(
				screen.getByRole("combobox", { name: "Account menu for discord.user" }),
			)
			.toBeVisible();
		expect(toast.success).toHaveBeenCalledWith("Logged in as discord.user");
		await screen
			.getByRole("combobox", { name: "Account menu for discord.user" })
			.click();
		await expect.element(screen.getByText("@discord.user")).toBeVisible();
	});

	it("does not announce an unsuccessful OAuth return", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		vi.mocked(auth.resolveAccount).mockResolvedValue(null);
		sessionStorage.setItem("remade-pending-login-toast", String(Date.now()));

		await render(<AuthMenu />);
		await expect
			.poll(() => sessionStorage.getItem("remade-pending-login-toast"))
			.toBeNull();
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("does not show Login while a returning session is being checked", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		let confirmAccount: (account: auth.Account | null) => void = () => {};
		vi.mocked(auth.resolveAccount).mockReturnValue(
			new Promise((resolve) => {
				confirmAccount = resolve;
			}),
		);

		const screen = await render(<AuthMenu />);
		await expect
			.element(screen.getByRole("link", { name: "Login" }))
			.not.toBeInTheDocument();

		confirmAccount(account);

		await expect
			.element(
				screen.getByRole("combobox", { name: "Account menu for Example User" }),
			)
			.toBeVisible();
		await expect
			.element(screen.getByRole("link", { name: "Login" }))
			.not.toBeInTheDocument();
	});

	it("does not treat an unavailable API as a signed-out session", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		vi.mocked(auth.resolveAccount).mockRejectedValue(new Error("Offline"));
		const screen = await render(<AuthMenu />);

		await expect.poll(() => auth.resolveAccount).toHaveBeenCalledOnce();
		await expect
			.element(screen.getByRole("link", { name: "Login" }))
			.not.toBeInTheDocument();
	});

	it("opens and dismisses the account menu with the keyboard", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		const screen = await render(<AuthMenu />);
		const trigger = screen.getByRole("combobox", {
			name: "Account menu for Example User",
		});
		await expect.element(trigger).toBeVisible();
		trigger.element().focus();
		await userEvent.keyboard("{ArrowDown}");
		await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
		await expect.element(trigger).toHaveAttribute("aria-expanded", "false");
		expect(auth.logout).not.toHaveBeenCalled();
	});

	it("shows logout errors and preserves the signed-in account", async () => {
		vi.mocked(auth.hasLoginHint).mockReturnValue(true);
		vi.mocked(auth.logout).mockRejectedValue(new Error("Offline"));
		const screen = await render(<AuthMenu />);
		await screen
			.getByRole("combobox", { name: "Account menu for Example User" })
			.click();
		await screen.getByText("Logout", { exact: true }).click();
		await expect
			.element(screen.getByRole("status"))
			.toHaveTextContent("Couldn’t log out. Please try again.");
		expect(toast.success).not.toHaveBeenCalled();
		await expect
			.element(
				screen.getByRole("combobox", { name: "Account menu for Example User" }),
			)
			.toBeVisible();
	});
});
