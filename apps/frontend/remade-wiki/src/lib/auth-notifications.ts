import { toast } from "sonner";
import { type Account, loginUrl } from "./auth";

import { type LoginProvider, rememberLoginProvider } from "./login-provider";

const loginToastKey = "remade-pending-login-toast";

export function promptLoginToVote() {
	toast.info("Login to vote", {
		id: "request-login-required",
		action: {
			label: "Login",
			onClick: () => {
				window.location.assign(loginUrl);
			},
		},
	});
}

export function rememberLogin(provider?: LoginProvider) {
	try {
		sessionStorage.setItem(loginToastKey, String(Date.now()));
		if (provider)
			sessionStorage.setItem("remade-pending-login-provider", provider);
	} catch {
		// Login still works when browser storage is unavailable.
	}
}

export function announceLogin(account: Account | null, search = "") {
	let pending: string | null = null;
	let pendingProvider: string | null = null;
	try {
		pending = sessionStorage.getItem(loginToastKey);
		pendingProvider = sessionStorage.getItem("remade-pending-login-provider");
		sessionStorage.removeItem(loginToastKey);
		sessionStorage.removeItem("remade-pending-login-provider");
	} catch {
		// Notifications and preferences are optional when storage is unavailable.
	}
	const elapsed = Date.now() - Number(pending);
	const recent = Boolean(pending) && elapsed >= 0 && elapsed < 10 * 60 * 1000;
	const result = new URLSearchParams(search);
	const successes = result.getAll("auth_success");
	if (
		!recent ||
		result.has("auth_error") ||
		successes.length !== 1 ||
		successes[0] !== pendingProvider
	)
		return;

	const identity = account?.identities.find(
		(identity) => identity.provider === pendingProvider,
	);
	if (!identity) return;
	rememberLoginProvider(identity.provider);
	toast.success(`Logged in as ${identity.username}`);
}
