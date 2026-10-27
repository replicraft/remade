import { toast } from "sonner";
import { type Account, loginUrl } from "./auth";

import {
	type LoginProvider,
	lastLoginProvider,
	rememberLoginProvider,
} from "./login-provider";

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

export function announceLogin(account: Account | null) {
	let pending: string | null = null;
	let pendingProvider: string | null = null;
	try {
		pending = sessionStorage.getItem(loginToastKey);
		pendingProvider = sessionStorage.getItem("remade-pending-login-provider");
		sessionStorage.removeItem(loginToastKey);
		sessionStorage.removeItem("remade-pending-login-provider");
	} catch {
		// Successful sessions still remember their provider if session storage is blocked.
	}
	const elapsed = Date.now() - Number(pending);
	const recent = Boolean(pending) && elapsed >= 0 && elapsed < 10 * 60 * 1000;
	const preferred = (recent && pendingProvider) || lastLoginProvider();
	const identity =
		account?.identities.find((identity) => identity.provider === preferred) ||
		account?.identities[0];
	if (identity) rememberLoginProvider(identity.provider);
	if (recent && identity) toast.success(`Logged in as ${identity.username}`);
}
