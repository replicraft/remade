// Run after each CI build to verify the emitted artifact, including discovery.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { parse } from "yaml";

const enabled = process.env.REMADE_LAUNCHER_ENABLED === "true";
const read = (path) => readFile(`dist/${path}`, "utf8");

assert.deepEqual(
	JSON.parse(await read("data/launcher.json")),
	parse(await readFile("../../../launcher.yaml", "utf8")),
);
assert.equal(existsSync("dist/launcher/index.html"), enabled);
assert.equal((await read("index.html")).includes('href="/launcher/"'), enabled);

const sitemaps = (await readdir("dist")).filter((path) =>
	/^sitemap.*\.xml$/.test(path),
);
const sitemap = (await Promise.all(sitemaps.map(read))).join("\n");

assert.equal(sitemap.includes("https://remade.wiki/launcher"), enabled);

if (enabled) {
	const page = await read("launcher/index.html");

	assert.ok(page.includes("The official launcher for unofficial apps."));
	assert.ok(page.includes("Downloads coming soon"));
	assert.ok(page.includes("FreeBSD"));
}

console.log(
	`Launcher build contract verified (page ${enabled ? "enabled" : "disabled"}).`,
);
