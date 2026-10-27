import { useEffect } from "react";
import { useAuthStore } from "../../stores/auth-store.ts";
import AuthProvider from "./AuthProvider";
import AuthToaster from "./AuthToaster";
import LoginButton from "./LoginButton";
import UserDropdown from "./UserDropdown";

export default function AuthMenu() {
	return (
		<AuthProvider>
			<AccountControls />
		</AuthProvider>
	);
}

function AccountControls() {
	const status = useAuthStore((state) => state.status);
	const initialize = useAuthStore((state) => state.initialize);

	useEffect(() => {
		const controller = new AbortController();
		void initialize(controller.signal);

		return () => controller.abort();
	}, [initialize]);

	return (
		<div className="relative h-[46px] w-[112px]" data-auth-slot>
			<AuthToaster />

			<div className="flex h-full w-full items-center justify-end">
				{status === "signed-in" && <UserDropdown />}
				{status === "signed-out" && <LoginButton />}
			</div>
		</div>
	);
}
