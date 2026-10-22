import { toast } from "sonner";
import { type Account, accountUsername, loginUrl } from "./auth";

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

export function rememberLogin() {
	try {
		sessionStorage.setItem(loginToastKey, String(Date.now()));
	} catch {
		// Login still works when browser storage is unavailable.
	}
}

export function announceLogin(account: Account | null) {
	try {
		const pending = sessionStorage.getItem(loginToastKey);
		sessionStorage.removeItem(loginToastKey);

		const username = accountUsername(account);
		const elapsed = Date.now() - Number(pending);

		if (pending && username && elapsed >= 0 && elapsed < 10 * 60 * 1000) {
			toast.success(`Logged in as ${username}`);
		}
	} catch {
		// Storage is only used to avoid announcing login on every page load.
	}
}
