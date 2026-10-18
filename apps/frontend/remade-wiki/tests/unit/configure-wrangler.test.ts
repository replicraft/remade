import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

async function configure(discordClientId?: string) {
	const directory = await mkdtemp(join(tmpdir(), "remade-discord-config-"));
	try {
		for (const file of ["configure-wrangler.mjs", "wrangler.toml"]) {
			await copyFile(
				new URL(`../../../../backend/remade-api/${file}`, import.meta.url),
				join(directory, file),
			);
		}
		execFileSync(
			process.execPath,
			[join(directory, "configure-wrangler.mjs")],
			{
				env: {
					GITHUB_CLIENT_ID: "test-github-client",
					D1_DATABASE_NAME: "test-db",
					D1_DATABASE_ID: "0199c128-5d8f-7a26-b1e8-40c906f33871",
					...(discordClientId === undefined
						? {}
						: { DISCORD_CLIENT_ID: discordClientId }),
				},
				stdio: "pipe",
			},
		);
		return await readFile(join(directory, "wrangler.generated.toml"), "utf8");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

describe("optional Discord deployment configuration", () => {
	it("preserves GitHub-only setup", async () => {
		expect(await configure()).not.toContain("DISCORD_CLIENT_ID");
	});

	it("includes the optional public application ID", async () => {
		expect(await configure("123456789012345678")).toContain(
			'DISCORD_CLIENT_ID = "123456789012345678"',
		);
	});

	it("rejects malformed application IDs instead of generating config", async () => {
		await expect(configure('123\nOTHER = "value"')).rejects.toThrow();
	});
});
