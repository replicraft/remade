import { expect, it } from "vitest";
import { launcherPageEnabled } from "../../src/integrations/launcher";
import {
	architecturesFor,
	detectLauncherPlatform,
	type LauncherRelease,
	launcherAsset,
} from "../../src/lib/launcher-downloads";

it.each([undefined, "", "false", "1", "TRUE"])(
	"keeps the Launcher page disabled for %s",
	(value) => {
		expect(launcherPageEnabled(value)).toBe(false);
	},
);

it("enables the page only with the explicit true value", () => {
	expect(launcherPageEnabled("true")).toBe(true);
});

it.each([
	["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "windows"],
	["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "macos"],
	["Mozilla/5.0 (X11; Linux x86_64)", "linux"],
	["Mozilla/5.0 (X11; FreeBSD amd64)", "freebsd"],
	["Mozilla/5.0 (Linux; Android 14)", "other"],
	["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "other"],
	["Unknown", "other"],
])("suggests a desktop platform for %s", (agent, expected) => {
	expect(detectLauncherPlatform(agent)).toBe(expected);
});

it("offers Universal on macOS and explicit 32-bit, 64-bit and ARM choices elsewhere", () => {
	expect(architecturesFor("macos")).toEqual(["universal", "x64", "arm64"]);
	expect(architecturesFor("windows")).toEqual(["x64", "x86", "arm64", "arm"]);
});

it("matches actual assets exactly and never invents a fallback download", () => {
	const asset = {
		platform: "macos",
		architecture: "universal",
		name: "fixture.dmg",
		downloadUrl: "https://example.org/fixture.dmg",
	} as const;
	const release: LauncherRelease = {
		status: "ready",
		version: "test-fixture",
		assets: [asset],
	};

	expect(launcherAsset(release, "macos", "universal")).toBe(asset);
	expect(launcherAsset(release, "macos", "arm64")).toBeUndefined();
	expect(launcherAsset(release, "linux", "x64")).toBeUndefined();
	expect(
		launcherAsset({ status: "loading" }, "macos", "universal"),
	).toBeUndefined();
	expect(
		launcherAsset({ status: "unavailable" }, "macos", "universal"),
	).toBeUndefined();
});
