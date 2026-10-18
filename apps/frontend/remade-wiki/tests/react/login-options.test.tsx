import { beforeEach, describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import LoginOptions from "../../src/components/auth/LoginOptions";
import { apiUrl } from "../../src/lib/auth";

beforeEach(() => sessionStorage.removeItem("remade-pending-login-toast"));

describe("login providers", () => {
	it("offers both providers when Discord is enabled", async () => {
		const screen = await render(<LoginOptions discordEnabled />);
		await expect
			.element(screen.getByRole("link", { name: "Continue with GitHub" }))
			.toHaveAttribute("href", `${apiUrl}/auth/github`);
		await expect
			.element(screen.getByRole("link", { name: "Continue with Discord" }))
			.toHaveAttribute("href", `${apiUrl}/auth/discord`);
		expect(sessionStorage.getItem("remade-pending-login-toast")).toBeNull();
	});

	it("keeps GitHub available before Discord is configured", async () => {
		const screen = await render(<LoginOptions discordEnabled={false} />);
		await expect
			.element(screen.getByRole("link", { name: "Continue with GitHub" }))
			.toBeVisible();
		await expect
			.element(screen.getByRole("link", { name: "Continue with Discord" }))
			.not.toBeInTheDocument();
	});
});
