import { afterEach, describe, expect, it, vi } from "vitest";
import {
	accountUsername,
	hasLoginHint,
	resolveAccount,
} from "../../src/lib/auth";

afterEach(() => vi.unstubAllGlobals());

describe("provider identities", () => {
	it.each(["github", "discord"])("accepts a %s session", async (provider) => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json({
					id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
					displayName: null,
					avatarUrl: null,
					identities: [{ provider, username: "example" }],
				}),
			),
		);
		expect(accountUsername(await resolveAccount())).toBe("example");
	});

	it("rejects unsupported provider identities", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json({
					id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
					displayName: null,
					avatarUrl: null,
					identities: [{ provider: "untrusted", username: "example" }],
				}),
			),
		);
		await expect(resolveAccount()).rejects.toThrow();
	});
});

describe("login hint", () => {
	it.each(["", "other=1", "remade_login_hint=0", "not_remade_login_hint=1"])(
		"does not detect authentication from %s",
		(cookies) => {
			expect(hasLoginHint(cookies)).toBe(false);
		},
	);

	it("recognizes the exact non-secret hint among other cookies", () => {
		expect(hasLoginHint("other=1; remade_login_hint=1; extra=2")).toBe(true);
	});
});
