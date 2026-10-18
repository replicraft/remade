import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
	architectureLabels,
	architecturesFor,
	detectLauncherPlatform,
	type LauncherArchitecture,
	type LauncherPlatform,
	type LauncherRelease,
	launcherAsset,
	launcherPlatforms,
	unavailableRelease,
} from "../../lib/launcher-downloads";

interface Props {
	release?: LauncherRelease;
}

export default function LauncherDownloads({
	release = unavailableRelease,
}: Props) {
	const [platform, setPlatform] = useState<LauncherPlatform | "">("");
	const [architecture, setArchitecture] = useState<LauncherArchitecture>("x64");

	useEffect(() => {
		const detected = detectLauncherPlatform(navigator.userAgent);

		setPlatform(detected);
		setArchitecture(architecturesFor(detected)[0]);
	}, []);

	const asset = launcherAsset(release, platform, architecture);
	const loading = release.status === "loading";
	const message = loading
		? "Loading release information…"
		: release.status === "unavailable"
			? "Downloads are not available yet. Release information will appear here when the launcher is ready."
			: !platform
				? "Choose your platform to find a download."
				: !asset
					? "No release is available for this platform and architecture. Try another build or check back later."
					: `${release.version} · ${asset.name}`;

	return (
		<div className="rounded-2xl border border-line bg-panel p-6 sm:p-8">
			<h2 className="mb-2" id="download-heading">
				Get Remade Launcher
			</h2>
			<p className="text-sm">A desktop home for independent software.</p>

			<div className="my-6 grid gap-4 sm:grid-cols-2">
				<label>
					Platform
					<select
						onChange={(event) => {
							const selected =
								launcherPlatforms.find(
									(item) => item.value === event.target.value,
								)?.value ?? "";

							setPlatform(selected);
							setArchitecture(architecturesFor(selected)[0]);
						}}
						value={platform}
					>
						<option disabled value="">
							Choose a platform
						</option>
						{launcherPlatforms.map((item) => (
							<option key={item.value} value={item.value}>
								{item.label}
							</option>
						))}
					</select>
				</label>

				<label>
					Architecture
					<select
						onChange={(event) => {
							const selected = architecturesFor(platform).find(
								(item) => item === event.target.value,
							);

							if (selected) setArchitecture(selected);
						}}
						value={architecture}
					>
						{architecturesFor(platform).map((item) => (
							<option key={item} value={item}>
								{architectureLabels[item]}
							</option>
						))}
					</select>
				</label>
			</div>

			<p className="text-xs">
				Your platform is selected automatically when recognized. You can change
				it above. Build options do not guarantee release availability.
			</p>

			{asset ? (
				<a
					className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime px-5 py-4 font-bold text-canvas hover:bg-lime-light hover:text-canvas"
					href={asset.downloadUrl}
				>
					<Download aria-hidden size={18} /> Download for{" "}
					{launcherPlatforms.find((item) => item.value === platform)?.label}
				</a>
			) : (
				<button
					aria-describedby="launcher-release-status"
					className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-lime px-5 py-4 font-bold text-canvas opacity-60"
					disabled
					type="button"
				>
					<Download aria-hidden size={18} />{" "}
					{loading
						? "Loading downloads…"
						: release.status === "ready"
							? "No matching download"
							: "Downloads coming soon"}
				</button>
			)}

			<p
				aria-busy={loading}
				aria-live="polite"
				className="mb-0 mt-4 text-sm"
				id="launcher-release-status"
				role="status"
			>
				{message}
			</p>
			<noscript>
				<p className="mb-0 mt-4 text-sm">
					Automatic platform selection requires JavaScript. No launcher
					downloads are published yet.
				</p>
			</noscript>

			{release.status === "ready" &&
			(release.sourceUrl || release.releasesUrl) ? (
				<div className="mt-5 flex flex-wrap gap-5 text-sm">
					{release.sourceUrl && (
						<a
							className="text-lime"
							href={release.sourceUrl}
							rel="noreferrer"
							target="_blank"
						>
							Source code ↗
						</a>
					)}
					{release.releasesUrl && (
						<a
							className="text-lime"
							href={release.releasesUrl}
							rel="noreferrer"
							target="_blank"
						>
							All releases ↗
						</a>
					)}
				</div>
			) : (
				<p className="mb-0 mt-5 border-t border-line pt-5 text-xs">
					Source code and releases will be linked here when the launcher
					repository is public.
				</p>
			)}
		</div>
	);
}
