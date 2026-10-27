import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import LoginOptions from "../../src/components/auth/LoginOptions";
import { apiUrl } from "../../src/lib/auth";

beforeEach(() => {
	sessionStorage.removeItem("remade-pending-login-toast");
	localStorage.removeItem("remade-last-login-provider");
});

describe("login providers", () => {
	it("offers both providers without feature configuration", async () => {
		const screen = await render(<LoginOptions />);
		await expect
			.element(screen.getByRole("link", { name: "Continue with GitHub" }))
			.toHaveAttribute("href", `${apiUrl}/auth/github`);
		await expect
			.element(screen.getByRole("link", { name: "Continue with Discord" }))
			.toHaveAttribute("href", `${apiUrl}/auth/discord`);
		expect(sessionStorage.getItem("remade-pending-login-toast")).toBeNull();
	});

	it("explains how to connect another provider", async () => {
		const screen = await render(<LoginOptions />);
		await expect
			.element(screen.getByText(/Connect another provider in Account settings/))
			.toBeVisible();
	});
});
