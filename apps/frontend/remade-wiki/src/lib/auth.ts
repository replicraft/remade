import * as v from "valibot";

export const apiUrl = (
	import.meta.env.PUBLIC_REMADE_API_BASE_URL || "https://api.remade.wiki/api/v1"
).replace(/\/$/, "");

export const loginUrl = "/login/";
export const discordLoginEnabled =
	import.meta.env.PUBLIC_REMADE_DISCORD_AUTH_ENABLED === "true";

const accountSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	displayName: v.nullable(v.string()),
	avatarUrl: v.nullable(v.pipe(v.string(), v.url())),
	identities: v.array(
		v.object({
			provider: v.picklist(["github", "discord"]),
			username: v.string(),
		}),
	),
});

export type Account = v.InferOutput<typeof accountSchema>;

export function accountUsername(account: Account | null): string | undefined {
	return account?.identities[0]?.username;
}

export function hasLoginHint(cookies: string): boolean {
	return cookies
		.split(";")
		.some((cookie) => cookie.trim() === "remade_login_hint=1");
}

export function clearLoginHint(): void {
	const secure = location.protocol === "https:" ? "; Secure" : "";
	const expired = `remade_login_hint=; Path=/; Max-Age=0; SameSite=Lax${secure}`;

	// biome-ignore lint/suspicious/noDocumentCookie: remove the shared hint on browsers without Cookie Store support.
	document.cookie = expired;

	if (
		location.hostname === "remade.wiki" ||
		location.hostname.endsWith(".remade.wiki")
	) {
		// biome-ignore lint/suspicious/noDocumentCookie: the domain must match the Worker's non-secret hint cookie.
		document.cookie = `${expired}; Domain=remade.wiki`;
	}
}

export async function resolveAccount(
	signal?: AbortSignal,
): Promise<Account | null> {
	const response = await fetch(`${apiUrl}/auth/me`, {
		credentials: "include",
		cache: "no-store",
		signal,
	});

	if (response.status === 401) {
		clearLoginHint();
		return null;
	}

	if (!response.ok) throw new Error("Account unavailable");

	return v.parse(accountSchema, await response.json());
}

export async function logout(): Promise<void> {
	const response = await fetch(`${apiUrl}/auth/logout`, {
		method: "POST",
		credentials: "include",
	});

	if (!response.ok) throw new Error("Logout unavailable");

	clearLoginHint();
}
