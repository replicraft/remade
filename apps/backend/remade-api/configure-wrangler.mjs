import { readFile, writeFile } from "node:fs/promises";

function required(name) {
	const value = process.env[name]?.trim();

	if (!value) {
		throw new Error(`Set ${name} to a nonempty value.`);
	}

	return value;
}

const clientId = required("GITHUB_CLIENT_ID");
const discordClientId = process.env.DISCORD_CLIENT_ID?.trim();
const databaseName = required("D1_DATABASE_NAME");
const databaseId = required("D1_DATABASE_ID");

if (!/^[A-Za-z0-9_-]+$/.test(clientId)) {
	throw new Error("GITHUB_CLIENT_ID must be a GitHub OAuth client ID.");
}

if (discordClientId && !/^[1-9][0-9]{0,19}$/.test(discordClientId)) {
	throw new Error("DISCORD_CLIENT_ID must be a Discord application ID.");
}

if (!/^[A-Za-z0-9_-]+$/.test(databaseName)) {
	throw new Error(
		"D1_DATABASE_NAME must contain only letters, digits, underscores or hyphens.",
	);
}

if (
	!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(databaseId) ||
	/^0+-0+-0+-0+-0+$/.test(databaseId)
) {
	throw new Error("D1_DATABASE_ID must be a provisioned D1 database UUID.");
}

const template = await readFile(
	new URL("wrangler.toml", import.meta.url),
	"utf8",
);
const config = template
	.replace(
		"[vars]",
		`[vars]\nGITHUB_CLIENT_ID = ${JSON.stringify(clientId)}${discordClientId ? `\nDISCORD_CLIENT_ID = ${JSON.stringify(discordClientId)}` : ""}`,
	)
	.replace(
		/^database_name = .*$/m,
		`database_name = ${JSON.stringify(databaseName)}`,
	)
	.replace(
		/^database_id = .*$/m,
		`database_id = ${JSON.stringify(databaseId)}`,
	);

await writeFile(new URL("wrangler.generated.toml", import.meta.url), config);
