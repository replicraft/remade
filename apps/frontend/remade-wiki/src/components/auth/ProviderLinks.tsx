import { useEffect, useState } from "react";
import { apiUrl, discordLoginEnabled } from "../../lib/auth";
import { rememberLogin } from "../../lib/auth-notifications";
import {
	type LoginProvider,
	lastLoginProvider,
} from "../../lib/login-provider";

export default function ProviderLinks({
	discordEnabled = discordLoginEnabled,
	variant = "menu",
}: {
	discordEnabled?: boolean;
	variant?: "menu" | "buttons";
}) {
	const [lastUsed, setLastUsed] = useState<LoginProvider | null>(null);
	useEffect(() => setLastUsed(lastLoginProvider()), []);
	const providers: LoginProvider[] = discordEnabled
		? ["github", "discord"]
		: ["github"];

	return (
		<div className={variant === "buttons" ? "grid gap-3" : "grid gap-1"}>
			{providers.map((provider) => (
				<a
					className={`flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${variant === "buttons" ? "border border-line bg-surface hover:border-lime hover:bg-panel" : "hover:bg-panel hover:text-lime"}`}
					href={`${apiUrl}/auth/${provider}`}
					key={provider}
					onClick={rememberLogin}
				>
					<ProviderLogo provider={provider} />
					<span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
						<span>
							Continue with {provider === "github" ? "GitHub" : "Discord"}
						</span>
						{lastUsed === provider && (
							<span className="rounded bg-panel px-2 py-1 text-[11px] font-medium text-lime">
								{" "}
								Last used
							</span>
						)}
					</span>
				</a>
			))}
		</div>
	);
}

function ProviderLogo({ provider }: { provider: LoginProvider }) {
	return (
		<svg
			aria-hidden="true"
			className="shrink-0"
			fill="currentColor"
			height="20"
			viewBox="0 0 24 24"
			width="20"
		>
			{provider === "github" ? (
				<path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.303-5.466-1.334-5.466-5.933 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.323 3.301 1.23A11.52 11.52 0 0 1 12 6.298c1.02.005 2.047.138 3.005.404 2.291-1.553 3.297-1.23 3.297-1.23.655 1.652.243 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.805 5.627-5.478 5.924.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.694.825.576C20.565 22.297 24 17.8 24 12.5 24 5.87 18.627.5 12 .5Z" />
			) : (
				<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.609 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.095.252-.194.373-.294a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.01c.121.1.247.2.374.295a.077.077 0 0 1-.006.127c-.597.35-1.22.648-1.873.891a.077.077 0 0 0-.04.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.178-.838-9.674-3.549-13.661a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418Zm7.975 0c-1.184 0-2.157-1.085-2.157-2.419 0-1.333.954-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
			)}
		</svg>
	);
}
