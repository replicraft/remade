import * as v from "valibot";
import { parseDocument } from "yaml";

import { categories, compatibility, statuses } from "./constants";

export { categories, compatibility, statuses } from "./constants";

const text = (min = 1, max = 400) =>
	v.pipe(
		v.string(),
		v.check(
			(s) => s.trim().length >= min && s.length <= max && !/[<>]/.test(s),
			"Expected plain text within the permitted length.",
		),
	);
const slug = v.pipe(v.string(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/));

export function publicHttps(value: string): boolean {
	try {
		const u = new URL(value);

		return (
			u.protocol === "https:" &&
			!u.username &&
			!u.password &&
			!u.port &&
			!/\s/.test(value) &&
			u.hostname.includes(".") &&
			!/^[\d.]+$/.test(u.hostname) &&
			!u.hostname.includes(":") &&
			!/\.(local|internal|localhost|test)$/.test(u.hostname)
		);
	} catch {
		return false;
	}
}

const https = v.pipe(
	v.string(),
	v.check(publicHttps, "Expected a public HTTPS URL."),
);
const repository = v.pipe(
	https,
	v.check((value) => {
		const u = new URL(value);
		const parts = u.pathname.slice(1).split("/");

		return (
			!u.search &&
			!u.hash &&
			parts.length >= 2 &&
			parts.every(Boolean) &&
			(u.hostname !== "github.com" ||
				(parts.length === 2 && !value.endsWith(".git")))
		);
	}, "Expected a canonical repository root."),
);
const authors = v.optional(
	v.pipe(
		v.array(
			v.pipe(v.string(), v.regex(/^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/)),
		),
		v.minLength(1),
		v.check((a) => new Set(a).size === a.length),
	),
);
const platforms = v.optional(v.array(text(1, 40)));
export const originalSchema = v.strictObject({
	slug,
	name: text(2, 100),
	url: https,
	category: v.picklist(categories),
	aliases: v.optional(v.array(text(1, 100))),
});
export const projectSchema = v.strictObject({
	slug,
	name: text(2, 100),
	repository,
	originals: v.pipe(
		v.array(slug),
		v.minLength(1),
		v.check(
			(values) => new Set(values).size === values.length,
			"Originals must be unique.",
		),
	),
	mirrors: v.optional(
		v.pipe(
			v.array(repository),
			v.minLength(1),
			v.check(
				(urls) =>
					new Set(urls.map((url) => url.toLowerCase().replace(/\.git$/, "")))
						.size === urls.length,
				"Mirror repositories must be unique.",
			),
		),
	),
	category: v.picklist(categories),
	languages: v.pipe(v.array(text(1, 40)), v.minLength(1)),
	platforms,
	authors,
	status: v.picklist(statuses),
	compatibility: v.picklist(compatibility),
	description: text(20, 500),
	license: text(2, 80),
	docs: v.optional(https),
	website: v.optional(https),
	limitations: v.optional(text(2, 400)),
});
export const toolSchema = v.strictObject({
	mirrors: projectSchema.entries.mirrors,
	license: v.optional(text(2, 80)),
	languages: projectSchema.entries.languages,
	status: v.optional(projectSchema.entries.status),
	docs: projectSchema.entries.docs,
	website: projectSchema.entries.website,
	limitations: projectSchema.entries.limitations,
	slug,
	name: text(2, 100),
	repository,
	url: https,
	description: projectSchema.entries.description,
	authors,
	platforms,
	projects: v.pipe(
		v.array(slug),
		v.minLength(1),
		v.check((a) => new Set(a).size === a.length),
	),
});
export const requestSchema = v.strictObject({
	original: slug,
	reason: text(20, 400),
	suggested_names: v.optional(
		v.pipe(
			v.array(text(2, 100)),
			v.minLength(1),
			v.check(
				(a) =>
					new Set(a.map((s) => s.trim().toLowerCase().replace(/\s+/g, " ")))
						.size === a.length,
			),
		),
	),
});
export const featuredSchema = v.array(slug);

export type Original = v.InferOutput<typeof originalSchema>;

export type Project = v.InferOutput<typeof projectSchema>;

export type Tool = v.InferOutput<typeof toolSchema>;

export type Request = v.InferOutput<typeof requestSchema>;

export type Catalog = {
	originals: Original[];
	projects: Project[];
	tools: Tool[];
	requests: Request[];
	featured: string[];
};

export function parseYaml(source: string): unknown {
	const document = parseDocument(source, { uniqueKeys: true });

	if (document.errors.length || document.warnings.length)
		throw new Error(
			[...document.errors, ...document.warnings]
				.map((e) => e.message)
				.join("\n"),
		);

	return document.toJS({ maxAliasCount: 20 }) as unknown;
}

export function validateRelationships(catalog: Catalog): void {
	const unique = (values: string[], kind: string) => {
		if (new Set(values).size !== values.length)
			throw new Error(`Duplicate ${kind}`);
	};

	unique(
		catalog.originals.map((o) => o.slug),
		"original slug",
	);
	unique(
		catalog.originals
			.flatMap((o) => [o.name, ...(o.aliases ?? [])])
			.map((s) => s.trim().toLowerCase().replace(/\s+/g, " ")),
		"original name or alias",
	);

	const entries = [...catalog.projects, ...catalog.tools];

	unique(
		entries.map((p) => p.slug),
		"entry slug",
	);
	unique(
		entries.map((p) => p.repository.toLowerCase().replace(/\.git$/, "")),
		"repository",
	);
	unique(catalog.featured, "featured slug");
	unique(
		catalog.requests.map((r) => r.original),
		"request",
	);

	for (const p of catalog.projects) {
		const targets = p.originals;

		unique(targets, "project original");

		for (const target of targets)
			if (!catalog.originals.some((o) => o.slug === target))
				throw new Error(`Unknown original: ${target}`);
	}

	for (const t of catalog.tools)
		for (const p of t.projects)
			if (!catalog.projects.some((e) => e.slug === p))
				throw new Error(`Unknown tool project: ${p}`);

	for (const r of catalog.requests) {
		if (!catalog.originals.some((o) => o.slug === r.original))
			throw new Error(`Unknown request original: ${r.original}`);

		if (catalog.projects.some((p) => p.originals.includes(r.original)))
			throw new Error(`Fulfilled request: ${r.original}`);
	}

	for (const slug of catalog.featured)
		if (!entries.some((e) => e.slug === slug))
			throw new Error(`Unknown featured entry: ${slug}`);
}
