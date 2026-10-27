import { useEffect } from "react";
import { apiUrl } from "../../lib/auth";
import { useAuthStore } from "../../stores/auth-store";
import AuthFeedback from "./AuthFeedback";
import AuthProvider from "./AuthProvider";

export default function AccountSettings() {
	return (
		<AuthProvider>
			<Settings />
		</AuthProvider>
	);
}

function Settings() {
	const account = useAuthStore((state) => state.account);
	const status = useAuthStore((state) => state.status);
	const initialize = useAuthStore((state) => state.initialize);

	useEffect(() => {
		const controller = new AbortController();
		void initialize(controller.signal);
		return () => controller.abort();
	}, [initialize]);

	return (
		<section className="mx-auto mt-12 max-w-lg sm:mt-20">
			<h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
			<p className="mt-3 text-sm leading-6 text-muted">
				Connect your sign-in methods to keep your votes and builder activity
				together.
			</p>
			{status === "checking" && <p role="status">Loading your account…</p>}
			{status === "unavailable" && (
				<p role="alert">
					Your account could not be loaded. Reload this page to try again.
				</p>
			)}
			{status === "signed-out" && (
				<a className="action-primary mt-5" href="/login/">
					Sign in to manage your account
				</a>
			)}
			{account && (
				<>
					<AuthFeedback account={account} />
					<div className="mt-7 grid gap-4">
						{(["github", "discord"] as const).map((provider) => {
							const identities = account.identities.filter(
								(identity) => identity.provider === provider,
							);
							const name = provider === "github" ? "GitHub" : "Discord";
							return (
								<div
									className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5"
									key={provider}
								>
									<div>
										<h2 className="m-0 text-base font-semibold">{name}</h2>
										{identities.map((identity) => (
											<p
												className="mb-0 mt-1 break-all text-sm text-muted"
												key={identity.username}
											>
												Connected as @{identity.username}
											</p>
										))}
									</div>
									{identities.length ? (
										<span className="text-xs font-semibold text-lime">
											Connected
										</span>
									) : (
										<form
											action={`${apiUrl}/auth/${provider}/link`}
											method="post"
										>
											<button className="action-secondary" type="submit">
												Connect {name}
											</button>
										</form>
									)}
								</div>
							);
						})}
					</div>
					<p className="mt-5 text-xs leading-5 text-muted">
						Connecting a provider asks you to authorize it. If it belongs to
						another account with a matching verified email, the accounts are
						merged, combining votes and builder activity. You’ll be signed out
						on other devices.
					</p>
				</>
			)}
		</section>
	);
}
