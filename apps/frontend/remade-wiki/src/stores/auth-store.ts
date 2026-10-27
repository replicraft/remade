import { createContext, useContext } from "react";
import { toast } from "sonner";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import {
	type Account,
	hasLoginHint,
	logout,
	resolveAccount,
} from "../lib/auth";
import { announceLogin } from "../lib/auth-notifications";

interface AuthState {
	status: "checking" | "signed-in" | "signed-out" | "unavailable";
	account: Account | null;
	busy: boolean;
	message: string;
	initialize: (signal: AbortSignal) => Promise<void>;
	signOut: () => Promise<void>;
	synchronize: (account: Account | null) => void;
}

export function createAuthStore() {
	let lookupVersion = 0;
	return createStore<AuthState>()((set, get) => ({
		account: null,
		status: "checking",
		busy: false,
		message: "",
		synchronize: (account) => {
			lookupVersion++;
			set({
				account,
				status: account ? "signed-in" : "signed-out",
				message: "",
			});
		},
		initialize: async (signal) => {
			const version = ++lookupVersion;
			if (!hasLoginHint(document.cookie)) {
				set({ account: null, status: "signed-out" });
				return;
			}

			set({ status: "checking" });

			try {
				const account = await resolveAccount(signal);
				if (signal.aborted || version !== lookupVersion) return;

				set({ account, status: account ? "signed-in" : "signed-out" });
				document.dispatchEvent(
					new CustomEvent("remade-auth-changed", { detail: account }),
				);
				announceLogin(account, location.search);
			} catch {
				// An unavailable API does not confirm the user is signed out.
				if (!signal.aborted && version === lookupVersion)
					set({ status: "unavailable" });
			}
		},
		signOut: async () => {
			if (get().busy) return;

			set({ busy: true, message: "" });

			try {
				await logout();
				get().synchronize(null);
				document.dispatchEvent(
					new CustomEvent("remade-auth-changed", { detail: null }),
				);
				toast.success("Logged out");
			} catch {
				set({ message: "Couldn’t log out. Please try again." });
			} finally {
				set({ busy: false });
			}
		},
	}));
}

export const AuthContext = createContext<ReturnType<
	typeof createAuthStore
> | null>(null);

export function useAuthStore<T>(selector: (state: AuthState) => T): T {
	const store = useContext(AuthContext);

	if (!store) throw new Error("AuthProvider is required");

	return useStore(store, selector);
}
