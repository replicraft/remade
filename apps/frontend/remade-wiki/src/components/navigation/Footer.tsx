import remadeMark from "../../assets/logos/remade-mark.svg?url";
import type { LegalDocument } from "../../lib/legal";
import { contributeUrl, repositoryUrl } from "../../lib/presentation";

export default function Footer({ legal = [] }: { legal?: LegalDocument[] }) {
	const groups = [
		{
			title: "Explore",
			links: [
				{ name: "Projects", href: "/explore/" },
				{ name: "Project Requests", href: "/requests/" },
				{ name: "Vendors", href: "/vendor/" },
				{ name: "About Remade", href: "/about/" },
			],
		},
		{
			title: "Community",
			links: [
				{
					name: "Submit a project",
					href: `${repositoryUrl}/issues/new?template=catalog-suggestion.yml`,
				},
				{ name: "Contribute", href: contributeUrl },
				{ name: "GitHub", href: repositoryUrl },
				{ name: "Discord", href: "https://discord.gg/xNASvxSx6j" },
			],
		},
		{
			title: "Legal",
			links: [
				...legal.map((document) => ({
					name: document.slug === "terms" ? "Terms" : "Privacy",
					href: `/${document.slug}/`,
				})),
				{ name: "Disclaimer", href: "/disclaimer/" },
				{ name: "Contact", href: "/disclaimer/#contact" },
			],
		},
	];

	return (
		<footer className="border-t border-line bg-deep" data-pagefind-ignore>
			<div className="mx-auto max-w-[1228px] px-[18px] sm:px-6">
				<div className="grid gap-12 py-12 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-20">
					<div className="max-w-sm">
						<a
							aria-label="Remade home"
							className="inline-flex items-center gap-3 text-2xl font-bold tracking-[-0.04em]"
							href="/"
						>
							<img alt="" height={28} src={remadeMark} width={28} />
							<span>
								remade<span className="text-lime">.wiki</span>
							</span>
						</a>
						<p className="mb-0 mt-5 text-base font-semibold text-ink">
							Everything can be remade.
						</p>
						<p className="mb-0 mt-3 max-w-[30ch] text-sm leading-6">
							Discover independently developed software reimplementations and
							help shape what gets built next.
						</p>
					</div>
					<nav
						aria-label="Footer"
						className="grid grid-cols-2 gap-x-6 gap-y-8 min-[480px]:grid-cols-3 sm:gap-x-10"
					>
						{groups.map((group) => (
							<div key={group.title}>
								<h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
									{group.title}
								</h2>
								<ul className="space-y-1">
									{group.links.map((link) => (
										<li key={link.href}>
											<a
												className="inline-flex min-h-10 items-center gap-1.5 py-1 text-sm text-muted transition-colors hover:text-lime motion-reduce:transition-none"
												href={link.href}
											>
												{link.name}
												{link.href.startsWith("https://") && (
													<span aria-hidden="true" className="text-xs">
														↗
													</span>
												)}
											</a>
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line py-6 text-xs text-muted">
					<p className="mb-0">Open source. Community maintained.</p>
					<a
						className="inline-flex min-h-8 items-center hover:text-lime"
						href="https://github.com/replicraft"
					>
						By Replicraft
					</a>
				</div>
			</div>
		</footer>
	);
}
