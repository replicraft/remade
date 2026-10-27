import { ArrowLeft } from "lucide-react";
import remadeMark from "../../assets/logos/remade-mark.svg?url";
import { discordLoginEnabled } from "../../lib/auth";
import ProviderLinks from "./ProviderLinks";

interface Props {
	discordEnabled?: boolean;
}

export default function LoginOptions({
	discordEnabled = discordLoginEnabled,
}: Props) {
	return (
		<section
			aria-labelledby="sign-in-heading"
			className="mx-auto mt-12 w-full max-w-sm px-2 sm:mt-20"
		>
			<div className="text-center">
				<img
					alt=""
					className="mx-auto mb-6"
					height={36}
					src={remadeMark}
					width={36}
				/>
				<h1 className="text-2xl font-bold tracking-tight" id="sign-in-heading">
					Sign in to Remade
				</h1>
				<p className="mx-auto mt-3 max-w-64 text-sm leading-6 text-muted">
					Vote for the apps you want.
					<br />
					Share what you’re building.
				</p>
			</div>

			<div className="mt-7">
				<ProviderLinks discordEnabled={discordEnabled} variant="buttons" />
			</div>

			{discordEnabled && (
				<p className="mt-5 text-center text-xs leading-5 text-muted">
					Use the same sign-in option each time.
					<br />
					GitHub and Discord accounts are separate.
				</p>
			)}

			<div className="mt-7 border-t border-line pt-5 text-center">
				<a
					className="inline-flex items-center gap-2 text-sm text-muted hover:text-lime"
					href="/requests/"
				>
					<ArrowLeft aria-hidden="true" size={14} />
					Keep browsing requests
				</a>
			</div>
		</section>
	);
}
