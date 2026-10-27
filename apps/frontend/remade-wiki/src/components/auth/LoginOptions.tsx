import { ArrowLeft } from "lucide-react";
import remadeMark from "../../assets/logos/remade-mark.svg?url";
import AuthFeedback from "./AuthFeedback";
import ProviderLinks from "./ProviderLinks";

export default function LoginOptions() {
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

			<AuthFeedback />

			<div className="mt-7">
				<ProviderLinks variant="buttons" />
			</div>

			<p className="mt-5 text-center text-xs leading-5 text-muted">
				Already have an account? Use your usual sign-in.
				<br />
				Connect another provider in Account settings.
			</p>

			<p className="mt-4 text-center text-xs leading-5 text-muted">
				Verified email helps prevent duplicate accounts.{" "}
				<a className="underline hover:text-lime" href="/disclaimer/">
					Account data
				</a>
			</p>

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
