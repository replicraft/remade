import * as v from "valibot";
import {
	originalSchema,
	projectSchema,
	requestSchema,
	suiteSchema,
	toolSchema,
} from "./schemas";
import { supportedProjectSlugs } from "./suites";

// Explicit public allowlists: future source fields are not automatically exported.
const publicOriginal = v.object({
	slug: originalSchema.entries.slug,
	name: originalSchema.entries.name,
	url: originalSchema.entries.url,
	category: originalSchema.entries.category,
	aliases: originalSchema.entries.aliases,
});
const addedAt = v.optional(v.pipe(v.string(), v.isoTimestamp()));
const publicProject = v.object({
	discord_server: projectSchema.entries.discord_server,
	discord_thread: projectSchema.entries.discord_thread,
	slug: projectSchema.entries.slug,
	name: projectSchema.entries.name,
	originals: projectSchema.entries.originals,
	repository: projectSchema.entries.repository,
	website: projectSchema.entries.website,
	docs: projectSchema.entries.docs,
	mirrors: projectSchema.entries.mirrors,
	category: projectSchema.entries.category,
	languages: projectSchema.entries.languages,
	platforms: projectSchema.entries.platforms,
	authors: projectSchema.entries.authors,
	status: projectSchema.entries.status,
	compatibility: projectSchema.entries.compatibility,
	summary: projectSchema.entries.summary,
	description: projectSchema.entries.description,
	license: projectSchema.entries.license,
	limitations: projectSchema.entries.limitations,
	addedAt,
});
const publicTool = v.object({
	mirrors: toolSchema.entries.mirrors,
	license: toolSchema.entries.license,
	languages: toolSchema.entries.languages,
	status: toolSchema.entries.status,
	docs: toolSchema.entries.docs,
	website: toolSchema.entries.website,
	limitations: toolSchema.entries.limitations,
	slug: toolSchema.entries.slug,
	name: toolSchema.entries.name,
	repository: toolSchema.entries.repository,
	url: toolSchema.entries.url,
	summary: toolSchema.entries.summary,
	description: toolSchema.entries.description,
	authors: toolSchema.entries.authors,
	platforms: toolSchema.entries.platforms,
	projects: toolSchema.entries.projects,
	suites: toolSchema.entries.suites,
	addedAt,
});
const publicSuite = v.object({
	slug: suiteSchema.entries.slug,
	name: suiteSchema.entries.name,
	description: suiteSchema.entries.description,
	projects: suiteSchema.entries.projects,
});
const publicRequest = v.object({
	discord_server: requestSchema.entries.discord_server,
	discord_thread: requestSchema.entries.discord_thread,
	original: requestSchema.entries.original,
	summary: requestSchema.entries.summary,
	reason: requestSchema.entries.reason,
	suggested_names: requestSchema.entries.suggested_names,
	vendor: v.string(),
	addedAt,
});

function originalsWithPages(originals: unknown[], site: string) {
	return v
		.parse(v.array(publicOriginal), originals)
		.sort((a, b) => a.slug.localeCompare(b.slug))
		.map((original) => ({
			...original,
			pageUrl: new URL(`/software/${original.slug}/`, site).href,
		}));
}

export function catalogExport(
	input: {
		originals: unknown[];
		projects: unknown[];
		tools: unknown[];
		featured: string[];
		suites?: unknown[];
	},
	site: string,
) {
	const suites = v.parse(v.array(publicSuite), input.suites ?? []);
	const tools = v.parse(v.array(publicTool), input.tools).map((tool) => ({
		...tool,
		projects: supportedProjectSlugs(tool, suites),
	}));

	return {
		schemaVersion: 1,
		site,
		originals: originalsWithPages(input.originals, site),
		projects: v
			.parse(v.array(publicProject), input.projects)
			.sort((a, b) => a.slug.localeCompare(b.slug))
			.map((project) => ({
				...project,
				pageUrl: new URL(`/projects/${project.slug}/`, site).href,
			})),
		tools: tools
			.sort((a, b) => a.slug.localeCompare(b.slug))
			.map((tool) => ({
				...tool,
				pageUrl: new URL(`/tools/${tool.slug}/`, site).href,
			})),
		featured: input.featured.slice(),
		suites: suites
			.sort((a, b) => a.slug.localeCompare(b.slug))
			.map((suite) => ({
				...suite,
				pageUrl: new URL(`/suites/${suite.slug}/`, site).href,
			})),
	};
}

export function requestsExport(
	input: { originals: unknown[]; requests: unknown[] },
	site: string,
) {
	const originals = new Map(
		originalsWithPages(input.originals, site).map((o) => [o.slug, o]),
	);

	return {
		schemaVersion: 1,
		site,
		requests: v
			.parse(v.array(publicRequest), input.requests)
			.sort((a, b) => a.original.localeCompare(b.original))
			.map((request) => {
				const original = originals.get(request.original);

				if (!original)
					throw new Error(
						`Unknown exported request original: ${request.original}`,
					);

				return { ...request, software: original };
			}),
	};
}

export function jsonResponse(data: unknown): Response {
	return new Response(`${JSON.stringify(data, null, 2)}\n`, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
			"Access-Control-Allow-Origin": "*",
		},
	});
}
