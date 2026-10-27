import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { catalogExport } from "../../src/lib/catalog-export";
import { type Project, projectSchema } from "../../src/lib/schemas";
import { projectScreenshotAssets } from "../../src/lib/screenshot-files";
import { screenshotUrl } from "../../src/lib/screenshots";

const project: Project = {
	slug: "sample",
	name: "Sample Project",
	repository: "https://github.com/example/sample",
	originals: ["sample-original"],
	category: "other",
	languages: ["Rust"],
	status: "experimental",
	compatibility: "partial",
	summary: "A sample implementation.",
	description: "An independent sample implementation for schema coverage.",
	license: "MIT",
};

const image = {
	src: "https://example.org/editor.png",
	alt: "The editor with a document open.",
};

describe("screenshot records", () => {
	it("allows omission and mixed local/remote images with optional captions", () => {
		expect(v.safeParse(projectSchema, project).success).toBe(true);
		expect(
			v.safeParse(projectSchema, {
				...project,
				screenshots: [
					image,
					{
						src: "./images/editor.webp",
						alt: "An editor.",
						caption: "Editing a file.",
					},
				],
			}).success,
		).toBe(true);
	});

	it.each(
		[
			[],
			[image, image],
			Array.from({ length: 13 }, (_, i) => ({
				...image,
				src: `https://example.org/${i}.png`,
			})),
			[{ ...image, alt: " " }],
			[{ ...image, caption: "<script>bad</script>" }],
			[{ ...image, unknown: true }],
			["https://example.org/image.png"],
			...[
				"http://example.org/a.png",
				"javascript:alert(1)",
				"data:image/png;base64,abc",
				"//example.org/a.png",
				"../a.png",
				"./nested/../a.png",
				"./nested//a.png",
				"./a.svg",
				"/etc/passwd",
				"./%2e%2e/a.png",
				"https://user:pass@example.org/a.png",
				"https://localhost/a.png",
			].map((src) => [{ ...image, src }]),
		].map((screenshots) => [screenshots]),
	)("rejects malformed or unsafe screenshots: %j", (screenshots) => {
		expect(
			v.safeParse(projectSchema, { ...project, screenshots }).success,
		).toBe(false);
	});

	it("exports absolute usable image URLs without mutating the catalog", () => {
		const input = {
			...project,
			screenshots: [{ src: "./editor.png", alt: "An editor." }, image],
		};
		const output = catalogExport(
			{ originals: [], projects: [input], tools: [], featured: [] },
			"https://remade.wiki/",
		);

		expect(output.projects[0].screenshots?.map((s) => s.src)).toEqual([
			"https://remade.wiki/media/screenshots/sample/1.png",
			image.src,
		]);
		expect(input.screenshots[0].src).toBe("./editor.png");
		expect(screenshotUrl(project.slug, image, 0)).toBe(image.src);
	});
});

it("serves only existing local files and rejects symlink escapes", async () => {
	const root = await mkdtemp(join(tmpdir(), "remade-screenshots-"));
	const folder = join(root, "project");
	await mkdir(folder);
	const path = join(folder, "sample.yaml");
	const local = {
		...project,
		screenshots: [{ src: "./editor.png", alt: "An editor." }],
	};

	try {
		await expect(projectScreenshotAssets(local, path)).rejects.toThrow();

		await writeFile(
			join(folder, "editor.png"),
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZwoAAAAASUVORK5CYII=",
				"base64",
			),
		);
		const assets = await projectScreenshotAssets(local, path);
		expect(assets).toEqual([
			{
				path: join(folder, "editor.png"),
				url: "/media/screenshots/sample/1.png",
				contentType: "image/png",
			},
		]);

		await writeFile(join(root, "outside.png"), "outside");
		await symlink(join(root, "outside.png"), join(folder, "escape.png"));
		await expect(
			projectScreenshotAssets(
				{
					...project,
					screenshots: [{ src: "./escape.png", alt: "An editor." }],
				},
				path,
			),
		).rejects.toThrow(/symlinks/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
