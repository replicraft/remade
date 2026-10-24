import type { Entry, Metadata } from "../../src/lib/catalog";

export const project: Extract<Entry, { kind: "project" }> = {
	kind: "project",
	slug: "alpha",
	name: "Alpha",
	repository: "https://github.com/example/alpha",
	originals: ["target"],
	category: "creative",
	languages: ["Rust"],
	platforms: ["Linux", "Windows"],
	status: "experimental",
	compatibility: "targeting",
	summary: "An early animation editor with familiar tools.",
	description: "Targets familiar animation editing workflows.",
	license: "MIT",
	limitations: "Project files are not yet supported.",
};
export const second = {
	...project,
	slug: "beta",
	name: "Beta",
	repository: "https://codeberg.org/example/beta",
	platforms: undefined,
};
export const stats: Metadata = {
	stars: 0,
	forks: 0,
	pushedAt: "2026-10-10T12:00:00Z",
	isArchived: true,
	fetchedAt: "2026-10-11T12:00:00Z",
};
