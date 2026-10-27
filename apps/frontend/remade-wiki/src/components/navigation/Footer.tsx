import { contributeUrl, repositoryUrl } from "../../lib/presentation";

export default function Footer() {
	return (
		<footer className="border-t border-line bg-deep py-10" data-pagefind-ignore>
			<div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-7 px-[18px] sm:px-6">
				<div>
					<a className="text-[1.4rem] font-bold tracking-[-0.04em]" href="/">
						remade<span className="text-lime">.wiki</span>
					</a>

					<p className="mb-0 mt-2.5 text-xs">Everything can be remade.</p>
				</div>

				<nav
					aria-label="Footer"
					className="flex flex-wrap items-center gap-6 text-sm"
				>
					<a href="/about/">About</a>

					<a href="/vendor/">Vendors</a>

					<a href={repositoryUrl}>GitHub</a>

					<a href="https://discord.gg/xNASvxSx6j">Discord</a>

					<a href={contributeUrl}>Submit</a>

					<a href="/disclaimer/">Disclaimer</a>
				</nav>
			</div>
		</footer>
	);
}
