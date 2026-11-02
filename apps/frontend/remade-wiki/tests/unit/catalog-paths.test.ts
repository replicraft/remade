import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";

it("loads every catalog source, fallback vendors, metadata and local screenshots from an encoded checkout path", async () => {
	const originalCwd = process.cwd();
	const temporary = await mkdtemp(join(tmpdir(), "remade-path-review-"));
	const repository = join(temporary, "checkout café #100%");
	const app = join(repository, "apps", "frontend", "remade-wiki");
	const catalog = join(app, "src", "content", "catalog");
	const projectFolder = join(catalog, "projects", "path-review");
	const screenshot = join(projectFolder, "editor.png");

	try {
		await mkdir(projectFolder, { recursive: true });
		await mkdir(join(app, "public"), { recursive: true });
		await writeFile(join(app, "public", "_redirects"), "");
		await writeFile(
			join(projectFolder, "path-review.yaml"),
			`slug: path-review
name: Path Review
repository: https://github.com/example/path-review
originals: [microsoft-paint]
category: creative
languages: [Rust]
status: experimental
compatibility: partial
summary: A local path review fixture.
description: An independent fixture for native filesystem path handling.
license: MIT
screenshots:
  - src: ./editor.png
    alt: Local path fixture.
`,
		);
		await writeFile(
			screenshot,
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZwoAAAAASUVORK5CYII=",
				"base64",
			),
		);
		await writeFile(
			join(catalog, "originals.yaml"),
			"- slug: path-review-original\n  name: Path Review Original\n  url: https://example.org/path-review\n  category: other\n- slug: microsoft-paint\n  name: Microsoft Paint\n  url: https://example.org/paint\n  category: creative\n",
		);
		await writeFile(
			join(catalog, "vendors.yaml"),
			"- slug: path-review-vendor\n  name: Path Review Vendor\n",
		);
		await writeFile(join(catalog, "featured.yaml"), "[path-review]\n");
		await mkdir(join(catalog, "suites"), { recursive: true });
		await writeFile(
			join(catalog, "suites", "path-review-suite.yaml"),
			"slug: path-review-suite\nname: Path Review Suite\ndescription: A suite for filesystem path regression coverage.\nprojects: [path-review]\n",
		);
		await mkdir(join(catalog, "tools", "example"), { recursive: true });
		await writeFile(
			join(catalog, "tools", "example", "path-review-tool.yaml"),
			"slug: path-review-tool\nname: Path Review Tool\nrepository: https://github.com/example/path-review-tool\nurl: https://example.org/path-review-tool\nlanguages: [Rust]\nsummary: A fixture supporting the review project.\ndescription: A tool for filesystem path regression coverage.\nsuites: [path-review-suite]\n",
		);
		const requests = join(catalog, "requests", "path-review-vendor");
		await mkdir(requests, { recursive: true });
		await writeFile(
			join(requests, "path-review-original.yaml"),
			"original: path-review-original\nsummary: A request for path review.\nreason: Reproduce the observable workflow of this path review fixture.\n",
		);
		await mkdir(join(repository, "cache"), { recursive: true });
		await writeFile(
			join(repository, "cache", "github-metadata.json"),
			JSON.stringify({
				repositories: {
					"example/path-review": {
						stars: 12,
						forks: 3,
						pushedAt: null,
						isArchived: false,
						fetchedAt: "2026-11-02T00:00:00Z",
					},
				},
			}),
		);

		vi.resetModules();
		const cwd = vi.spyOn(process, "cwd").mockReturnValue(app);
		let loader: typeof import("../../src/lib/catalog");

		try {
			loader = await import("../../src/lib/catalog");
		} finally {
			cwd.mockRestore();
		}

		const loaded = await loader.loadCatalog();
		expect(
			loaded.projects.some((project) => project.slug === "path-review"),
		).toBe(true);
		expect(loaded.tools[0].projects).toEqual(["path-review"]);
		expect(loaded.suites[0].slug).toBe("path-review-suite");
		expect(loaded.featured).toEqual(["path-review"]);
		expect(
			loaded.requests.find(
				(request) => request.original === "path-review-original",
			)?.vendor,
		).toBe("path-review-vendor");
		expect(await loader.loadScreenshotAssets()).toContainEqual({
			path: await realpath(screenshot),
			url: "/media/screenshots/path-review/1.png",
			contentType: "image/png",
		});
		expect((await loader.loadMetadata())["example/path-review"].stars).toBe(12);
	} finally {
		process.chdir(originalCwd);
		await rm(temporary, { recursive: true, force: true, maxRetries: 5 });
	}
}, 30_000);
