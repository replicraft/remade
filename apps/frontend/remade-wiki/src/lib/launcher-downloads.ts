export const launcherPlatforms = [
	{ value: "windows", label: "Windows" },
	{ value: "macos", label: "macOS" },
	{ value: "linux", label: "Linux" },
	{ value: "freebsd", label: "FreeBSD" },
	{ value: "other", label: "Other platform" },
] as const;

export type LauncherPlatform = (typeof launcherPlatforms)[number]["value"];
export type LauncherArchitecture =
	| "x86"
	| "x64"
	| "arm"
	| "arm64"
	| "universal";

export interface LauncherAsset {
	platform: LauncherPlatform;
	architecture: LauncherArchitecture;
	name: string;
	downloadUrl: string;
}

// A future build-time GitHub Releases adapter can supply this view model.
// No visitor API requests or guessed repository/asset URLs are needed.
export type LauncherRelease =
	| { status: "loading" }
	| { status: "unavailable" }
	| {
			status: "ready";
			version: string;
			assets: LauncherAsset[];
			sourceUrl?: string;
			releasesUrl?: string;
	  };

export const unavailableRelease: LauncherRelease = { status: "unavailable" };

export function detectLauncherPlatform(userAgent: string): LauncherPlatform {
	if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return "other";
	if (/Windows/i.test(userAgent)) return "windows";
	if (/FreeBSD/i.test(userAgent)) return "freebsd";
	if (/Macintosh|Mac OS X/i.test(userAgent)) return "macos";
	if (/Linux/i.test(userAgent)) return "linux";

	return "other";
}

export function architecturesFor(platform: LauncherPlatform | "") {
	return platform === "macos"
		? (["universal", "x64", "arm64"] as const)
		: (["x64", "x86", "arm64", "arm"] as const);
}

export const architectureLabels: Record<LauncherArchitecture, string> = {
	x86: "32-bit (x86)",
	x64: "64-bit (x64)",
	arm: "ARM (32-bit)",
	arm64: "ARM (64-bit)",
	universal: "Universal",
};

export function launcherAsset(
	release: LauncherRelease,
	platform: LauncherPlatform | "",
	architecture: LauncherArchitecture,
): LauncherAsset | undefined {
	return release.status === "ready"
		? release.assets.find(
				(asset) =>
					asset.platform === platform && asset.architecture === architecture,
			)
		: undefined;
}
