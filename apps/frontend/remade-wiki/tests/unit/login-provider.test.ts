import { afterEach, expect, it, vi } from "vitest";
import { announceLogin } from "../../src/lib/auth-notifications";
import {
	lastLoginProvider,
	rememberLoginProvider,
} from "../../src/lib/login-provider";

afterEach(() => vi.unstubAllGlobals());

it.each([null, "invalid", "github", "discord"])(
	"validates the stored preference %s",
	(value) => {
		vi.stubGlobal("localStorage", { getItem: () => value });
		expect(lastLoginProvider()).toBe(
			value === "github" || value === "discord" ? value : null,
		);
	},
);

it("keeps login working when storage is blocked", () => {
	vi.stubGlobal("localStorage", {
		getItem: () => {
			throw new Error("Storage blocked");
		},
		setItem: () => {
			throw new Error("Storage blocked");
		},
	});
	expect(lastLoginProvider()).toBeNull();
	expect(() => rememberLoginProvider("discord")).not.toThrow();
});

it("does not replace the last successful provider after a failed login", () => {
	const setItem = vi.fn();
	vi.stubGlobal("localStorage", { setItem });
	announceLogin(null);
	expect(setItem).not.toHaveBeenCalled();
});
