export type LoginProvider = "github" | "discord";

const storageKey = "remade-last-login-provider";

export function lastLoginProvider(): LoginProvider | null {
	try {
		const value = localStorage.getItem(storageKey);
		return value === "github" || value === "discord" ? value : null;
	} catch {
		return null;
	}
}

export function rememberLoginProvider(provider: LoginProvider): void {
	try {
		localStorage.setItem(storageKey, provider);
	} catch {
		// Provider preference is optional when browser storage is unavailable.
	}
}
