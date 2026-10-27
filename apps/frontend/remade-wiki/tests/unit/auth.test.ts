import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	accountUsername,
	hasLoginHint,
	resolveAccount,
	usesActivityPreview,
} from "../../src/lib/auth";

beforeEach(() => vi.stubEnv("DEV", false));

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("local API configuration", () => {
	it("uses preview data only for unconfigured development", () => {
		vi.stubEnv("DEV", true);
		vi.stubEnv("PUBLIC_REMADE_API_BASE_URL", "");
		expect(usesActivityPreview()).toBe(true);

		vi.stubEnv("PUBLIC_REMADE_API_BASE_URL", "http://localhost:8787/api/v1");
		expect(usesActivityPreview()).toBe(false);
	});

	it("resolves real sessions and logs out through the configured local API", async () => {
		vi.stubEnv("DEV", true);
		vi.stubEnv("PUBLIC_REMADE_API_BASE_URL", "http://localhost:8787/api/v1");
		const account = {
			id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
			displayName: "Example",
			avatarUrl: null,
			identities: [{ provider: "discord", username: "example" }],
		};
		const fetcher = vi
			.fn()
			.mockResolvedValueOnce(Response.json(account))
			.mockResolvedValueOnce(new Response(null, { status: 204 }));
		vi.stubGlobal("fetch", fetcher);
		vi.stubGlobal("location", { protocol: "http:", hostname: "localhost" });
		vi.stubGlobal("document", { cookie: "remade_login_hint=1" });

		vi.resetModules();
		const localAuth = await import("../../src/lib/auth");
		expect(await localAuth.resolveAccount()).toEqual(account);
		await localAuth.logout();
		expect(fetcher).toHaveBeenCalledTimes(2);
		expect(fetcher.mock.calls[0][0]).toBe(
			"http://localhost:8787/api/v1/auth/me",
		);
		expect(fetcher.mock.calls[1][0]).toBe(
			"http://localhost:8787/api/v1/auth/logout",
		);
		expect(fetcher.mock.calls[1][1]).toMatchObject({
			method: "POST",
			credentials: "include",
		});
	});
});

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
