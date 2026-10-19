import * as v from "valibot";
import { beforeAll, expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import { catalogExport, requestsExport } from "../../src/lib/catalog-export";
import { projectSchema, requestSchema } from "../../src/lib/schemas";

const fields = ["discord_server", "discord_thread"] as const;
const schemas = [v.pick(projectSchema, fields), v.pick(requestSchema, fields)];
const links = {
	discord_server: "https://discord.gg/example",
	discord_thread: "https://discord.com/channels/123/456/789",
};

it.each(schemas)("accepts optional Discord links independently", (schema) => {
	expect(v.parse(schema, {})).toEqual({});
	expect(v.parse(schema, links)).toEqual(links);
	expect(
		v.parse(schema, { discord_server: "https://discord.com/invite/example/" }),
	).toEqual({ discord_server: "https://discord.com/invite/example/" });
	expect(
		v.parse(schema, {
			discord_thread: "https://discord.com/channels/123/456/",
		}),
	).toEqual({ discord_thread: "https://discord.com/channels/123/456/" });
});

it.each(schemas)(
	"accepts reviewed project-owned Discord redirects",
	(schema) => {
		for (const url of [
			"https://solidcraft.io/discord",
			"https://solidcraft.io/discord/",
		]) {
			expect(v.parse(schema, { discord_server: url })).toEqual({
				discord_server: url,
			});
		}
	},
);

it.each([
	["discord_server", "http://solidcraft.io/discord"],
	["discord_server", "https://solidcraft.io/discord?redirect=evil"],
	["discord_server", "https://solidcraft.io/discord#fragment"],
	["discord_server", "https://user@solidcraft.io/discord"],
	["discord_server", "https://solidcraft.io/community"],
	["discord_server", "http://discord.gg/example"],
	["discord_server", "https://discord.gg.evil.com/example"],
	["discord_server", "https://discord.com/channels/123/456"],
	["discord_server", "https://discord.gg/example?redirect=evil"],
	["discord_thread", "https://discord.com/invite/example"],
	["discord_thread", "https://discord.com/channels/@me/123"],
	["discord_thread", "https://discord.com/channels/123/456#fragment"],
	["discord_thread", "https://user@discord.com/channels/123/456"],
	["discord_thread", "https://discord.com:443/channels/123/456"],
	["discord_thread", "https://discord.com/channels/123/456\n"],
	["discord_thread", null],
	["discord_server", ""],
	["discord_server", []],
])("rejects malformed %s: %j", (field, value) => {
	for (const schema of schemas)
		expect(() => v.parse(schema, { [field]: value })).toThrow();
});

let catalog: Awaited<ReturnType<typeof loadCatalog>>;
beforeAll(async () => {
	catalog = await loadCatalog();
});

it("omits Discord links from project and request exports", () => {
	const output = catalogExport(
		{
			...catalog,
			projects: catalog.projects.map((project, index) =>
				index === 0 ? { ...project, ...links } : project,
			),
		},
		"https://remade.wiki/",
	);
	expect(
		output.projects.find(
			(project) => project.slug === catalog.projects[0].slug,
		),
	).toEqual(expect.not.objectContaining(links));
	expect(
		JSON.stringify(
			output.projects.find(
				(project) => project.slug === catalog.projects[1].slug,
			),
		),
	).not.toContain("discord_");
	const requests = requestsExport(
		{
			...catalog,
			requests: catalog.requests.map((request, index) =>
				index === 0 ? { ...request, ...links } : request,
			),
		},
		"https://remade.wiki/",
	);
	expect(
		requests.requests.find(
			(request) => request.original === catalog.requests[0].original,
		),
	).toEqual(expect.not.objectContaining(links));
	expect(
		JSON.stringify(
			requests.requests.find(
				(request) => request.original === catalog.requests[1].original,
			),
		),
	).not.toContain("discord_");

	for (const entry of [...output.projects, ...requests.requests]) {
		for (const field of fields) expect(entry).not.toHaveProperty(field);
	}
});
