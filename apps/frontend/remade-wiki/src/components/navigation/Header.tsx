import type { ReactNode } from "react";
import remadeMark from "../../assets/logos/remade-mark.svg?url";
import { repositoryUrl } from "../../lib/presentation";
export default function Header({
	pathname,
	children,
}: {
	pathname: string;
	children?: ReactNode;
}) {
	const links = [
		{ href: "/explore/", name: "Explore" },
		{ href: "/requests/", name: "Requests" },
		{ href: "/about/", name: "About" },
	];
	return (
		<header className="border-b border-line" data-pagefind-ignore>
			<div className="site-header">
				<a aria-label="Remade home" className="brand" href="/">
					<img alt="" height={30} src={remadeMark} width={30} />
					<span>
						remade<span className="text-lime">.wiki</span>
					</span>
				</a>
				<nav
					aria-label="Main navigation"
					className="hidden items-center gap-6 text-sm min-[850px]:flex"
				>
					{links.map((link) => (
						<a
							aria-current={pathname.startsWith(link.href) ? "page" : undefined}
							href={link.href}
							key={link.href}
						>
							{link.name}
						</a>
					))}
					<a href={repositoryUrl}>GitHub ↗</a>
				</nav>
				<div className="ml-auto flex items-center gap-2 sm:gap-5">
					<a
						className="action-primary hidden min-[850px]:inline-flex"
						href="/requests/new/"
					>
						Request a project
					</a>
					<details className="mobile-navigation min-[850px]:hidden">
						<summary aria-label="Menu" className="action-secondary !px-3">
							<svg
								aria-hidden="true"
								fill="none"
								height="20"
								stroke="currentColor"
								strokeWidth="1.6"
								viewBox="0 0 24 24"
								width="20"
							>
								<path d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						</summary>
						<nav aria-label="Mobile navigation">
							{links.map((link) => (
								<a
									aria-current={
										pathname.startsWith(link.href) ? "page" : undefined
									}
									href={link.href}
									key={link.href}
								>
									{link.name}
								</a>
							))}
							<a href="/requests/new/">Request a project</a>
							<a href={repositoryUrl}>GitHub ↗</a>
						</nav>
					</details>
					{children}
				</div>
			</div>
		</header>
	);
}
