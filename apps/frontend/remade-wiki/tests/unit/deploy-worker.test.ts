import { spawnSync } from "node:child_process";
import {
	copyFile,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function deploy(failure: "none" | "config" | "migration") {
	const directory = await mkdtemp(join(tmpdir(), "remade-deploy-"));
	try {
		const worker = join(directory, "worker");
		const bin = join(directory, "bin");
		const log = join(directory, "commands");
		await mkdir(join(worker, "scripts"), { recursive: true });
		await mkdir(bin);
		await copyFile(
			new URL(
				"../../../../backend/remade-api/scripts/deploy.sh",
				import.meta.url,
			),
			join(worker, "scripts/deploy.sh"),
		);
		// Stub every external command: this never runs Wrangler or reads real env files.
		await writeFile(
			join(bin, "node"),
			`#!/bin/bash
printf 'config %s\\n' "$PWD" >> "$DEPLOY_TEST_LOG"
if [ "$DEPLOY_TEST_FAILURE" = config ]; then exit 21; fi
`,
			{ mode: 0o755 },
		);
		await writeFile(
			join(bin, "pnpm"),
			`#!/bin/bash
printf '%s\\n' "$*" >> "$DEPLOY_TEST_LOG"
if [ "$3" = d1 ] && [ "$DEPLOY_TEST_FAILURE" = migration ]; then exit 22; fi
`,
			{ mode: 0o755 },
		);
		const result = spawnSync("/bin/bash", [join(worker, "scripts/deploy.sh")], {
			cwd: directory,
			env: {
				PATH: `${bin}:/usr/bin:/bin`,
				CARGO_HOME: join(directory, "cargo"),
				DEPLOY_TEST_LOG: log,
				DEPLOY_TEST_FAILURE: failure,
			},
			encoding: "utf8",
		});
		return {
			status: result.status,
			commands: (await readFile(log, "utf8")).trim().split("\n"),
			worker,
		};
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

describe("Worker production deployment", () => {
	it("generates configuration and migrates before deploying from any directory", async () => {
		const result = await deploy("none");
		expect(result.status).toBe(0);
		expect(result.commands).toEqual([
			`config ${result.worker}`,
			"exec wrangler d1 migrations apply DB --remote --config wrangler.generated.toml",
			"exec wrangler deploy --config wrangler.generated.toml",
		]);
	});

	it("does not deploy if migration fails", async () => {
		const result = await deploy("migration");
		expect(result.status).toBe(22);
		expect(result.commands).toHaveLength(2);
		expect(result.commands.at(-1)).toContain("d1 migrations apply");
	});

	it("does not migrate or deploy if configuration fails", async () => {
		const result = await deploy("config");
		expect(result.status).toBe(21);
		expect(result.commands).toEqual([`config ${result.worker}`]);
	});
});
