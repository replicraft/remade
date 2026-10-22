import type { MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	announceLogin,
	promptLoginToVote,
} from "../../src/lib/auth-notifications";

vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn() } }));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe("sign-in notifications", () => {
	it("takes voters to the provider chooser", () => {
		const assign = vi.fn();
		vi.stubGlobal("window", { location: { assign } });
		promptLoginToVote();
		const options = vi.mocked(toast.info).mock.calls[0][1];
		const action = options?.action;
		if (!action || typeof action !== "object" || !("onClick" in action))
			throw new Error("Login action missing");
		action.onClick({} as ReactMouseEvent<HTMLButtonElement>);
		expect(assign).toHaveBeenCalledWith("/login/");
	});

	it("announces a confirmed Discord return only once", () => {
		const storage = new Map([
			["remade-pending-login-toast", String(Date.now())],
		]);
		vi.stubGlobal("sessionStorage", {
			getItem: (key: string) => storage.get(key) ?? null,
			removeItem: (key: string) => storage.delete(key),
		});
		const account = {
			id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
			displayName: null,
			avatarUrl: null,
			identities: [{ provider: "discord" as const, username: "example.user" }],
		};
		announceLogin(account);
		announceLogin(account);
		expect(toast.success).toHaveBeenCalledExactlyOnceWith(
			"Logged in as example.user",
		);
	});
});
