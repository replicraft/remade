import { Compass, Download, FolderOpen, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import remadeMark from "../../assets/logos/remade-mark.svg?url";

const capabilities = [
	{
		title: "Discover",
		icon: Compass,
		text: "Explore a curated selection of independent software reimplementations.",
	},
	{
		title: "Install",
		icon: Download,
		text: "Find builds for your computer and bring your chosen apps into one place.",
	},
	{
		title: "Update",
		icon: RefreshCw,
		text: "Keep track of new releases and manage updates across your library.",
	},
	{
		title: "Make it yours",
		icon: FolderOpen,
		text: "Launch your apps and organize your library from a single desktop home.",
	},
];

export default function LauncherPage({ children }: { children: ReactNode }) {
	return (
		<>
			<div className="grid items-center gap-10 pt-14 sm:pt-[90px] lg:grid-cols-[1.1fr_1fr] lg:gap-16">
				<div>
					<div className="mb-6 flex items-center gap-3">
						<img alt="" height={40} src={remadeMark} width={40} />
						<span className="text-xs font-bold uppercase tracking-wide text-muted">
							A new way to explore Remade
						</span>
					</div>

					<h1>Remade Launcher</h1>
					<p className="max-w-[580px] text-2xl font-semibold leading-snug text-ink sm:text-3xl">
						The official launcher for unofficial apps.
					</p>
					<p className="max-w-[580px] text-lg">
						Discover, install, update and launch curated software
						reimplementations. One place to manage the apps you choose.
					</p>
					<p className="mb-0 max-w-[560px] text-sm">
						Planned as a standalone, cross-platform Rust application. The
						launcher is in planning; the features described here are intended
						functionality.
					</p>
				</div>

				<section aria-labelledby="download-heading" className="mt-0! min-w-0">
					{children}
				</section>
			</div>

			<section aria-labelledby="preview-heading">
				<div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
					<h2 className="mb-0" id="preview-heading">
						Your next desktop companion.
					</h2>
					<span className="text-xs text-muted">
						Application preview coming later
					</span>
				</div>

				<div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-deep px-6 py-14 text-center sm:min-h-[360px]">
					<img
						alt=""
						className="mb-5 opacity-60"
						height={56}
						src={remadeMark}
						width={56}
					/>
					<p className="mb-2 font-semibold text-ink">
						A home for your app library.
					</p>
					<p className="mb-0 max-w-[430px] text-sm">
						Screenshots and a closer look at the launcher will appear here as
						development progresses.
					</p>
				</div>
			</section>

			<section aria-labelledby="capabilities-heading">
				<h2 id="capabilities-heading">From discovery to your desktop.</h2>
				<p className="max-w-[650px]">
					The planned launcher brings the essentials together, with a
					deliberately curated app selection separate from the full Remade
					directory.
				</p>

				<div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{capabilities.map(({ title, icon: Icon, text }) => (
						<div className="border-t border-line pt-6" key={title}>
							<Icon aria-hidden className="mb-5 text-muted" size={24} />
							<h3>{title}</h3>
							<p className="mb-0 text-sm">{text}</p>
						</div>
					))}
				</div>
			</section>
		</>
	);
}
