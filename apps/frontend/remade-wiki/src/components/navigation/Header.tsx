import type { ReactNode } from "react";
import remadeMark from "../../assets/logos/remade-mark.svg?url";
import { formatStars, repositoryUrl } from "../../lib/presentation";
export default function Header({
	pathname,
	stars,
	children,
}: {
	pathname: string;
	stars?: number;
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
					className="hidden items-center gap-6 text-sm lg:flex"
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
					<RepositoryLink stars={stars} />
				</nav>
				<div className="ml-auto flex items-center gap-2 sm:gap-5">
					<a
						className="action-primary hidden lg:inline-flex"
						href="/requests/new/"
					>
						Request a project
					</a>
					<details className="mobile-navigation lg:hidden">
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
							<RepositoryLink stars={stars} />
						</nav>
					</details>
					{children}
				</div>
			</div>
		</header>
	);
}

function RepositoryLink({ stars }: { stars?: number }) {
	return (
		<a className="inline-flex items-center gap-2" href={repositoryUrl}>
			GitHub ↗
			{stars !== undefined && (
				<span className="whitespace-nowrap rounded border border-line px-2 py-1 text-xs">
					<span aria-hidden="true">★ {formatStars(stars)}</span>
					<span className="sr-only">
						{stars.toLocaleString("en")} GitHub stars
					</span>
				</span>
			)}
		</a>
	);
}
