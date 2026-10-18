import { LogIn } from "lucide-react";
import { apiUrl, discordLoginEnabled } from "../../lib/auth";
import { rememberLogin } from "../../lib/auth-notifications";

interface Props {
	discordEnabled?: boolean;
}

export default function LoginOptions({
	discordEnabled = discordLoginEnabled,
}: Props) {
	const providers = discordEnabled ? ["GitHub", "Discord"] : ["GitHub"];

	return (
		<div className="mx-auto mt-14 max-w-md rounded-2xl border border-line bg-panel p-6 sm:mt-20 sm:p-8">
			<h1 className="text-3xl font-bold tracking-tight">Sign in to Remade</h1>
			<p className="mt-3 leading-7 text-muted">
				Upvote requests and show what you’re building.
			</p>

			<div className="mt-7 grid gap-3">
				{providers.map((provider) => (
					<a
						className="inline-flex items-center justify-center gap-3 rounded-lg border border-line px-4 py-3 font-semibold hover:border-lime hover:text-lime"
						href={`${apiUrl}/auth/${provider.toLowerCase()}`}
						key={provider}
						onClick={rememberLogin}
					>
						<LogIn aria-hidden="true" size={18} />
						Continue with {provider}
					</a>
				))}
			</div>

			{discordEnabled && (
				<p className="mt-5 text-sm leading-6 text-muted">
					Use the same sign-in option each time to keep your activity together.
				</p>
			)}

			<a
				className="mt-6 inline-block text-sm text-muted hover:text-lime"
				href="/requests/"
			>
				Keep browsing requests
			</a>
		</div>
	);
}
