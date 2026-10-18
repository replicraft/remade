import type { ReactNode } from "react";
import remadeMark from "../../assets/logos/remade-mark.svg?url";
import { contributeUrl, repositoryUrl } from "../../lib/presentation";

interface Props {
	pathname: string;
	children?: ReactNode;
	launcherEnabled?: boolean;
}

export default function Header({
	pathname,
	children,
	launcherEnabled = false,
}: Props) {
	return (
		<header className="border-b border-line" data-pagefind-ignore>
			<div className="mx-auto flex min-h-[88px] max-w-[1180px] flex-wrap items-center justify-between gap-5 px-[18px] py-[18px] sm:px-6 sm:py-0">
				<a
					aria-label="Remade home"
					className="flex items-center gap-3 text-[1.4rem] font-bold tracking-[-0.04em]"
					href="/"
				>
					<img
						alt=""
						className="size-9"
						height={36}
						src={remadeMark}
						width={36}
					/>

					<span>
						remade<span className="text-lime">.wiki</span>
					</span>
				</a>

				<nav
					aria-label="Main navigation"
					className="flex flex-wrap items-center gap-4 text-sm sm:gap-6"
				>
					<a
						aria-current={pathname.startsWith("/explore") ? "page" : undefined}
						className="aria-[current=page]:text-lime"
						href="/explore/"
					>
						Explore
					</a>

					<a
						aria-current={pathname.startsWith("/requests") ? "page" : undefined}
						className="aria-[current=page]:text-lime"
						href="/requests/"
					>
						Requests
					</a>

					{launcherEnabled && (
						<a
							aria-current={
								pathname.startsWith("/launcher") ? "page" : undefined
							}
							className="aria-[current=page]:text-lime"
							href="/launcher/"
						>
							Launcher
						</a>
					)}

					<a href={repositoryUrl}>GitHub ↗</a>

					<a
						className="inline-flex rounded-lg border border-line px-4 py-3 font-semibold hover:border-lime"
						href={contributeUrl}
					>
						Submit a project
					</a>

					{children}
				</nav>
			</div>
		</header>
	);
}
