import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import * as v from "valibot";
import { catalogAddedAt, loadAdditionDates } from "./catalog-history";
import { parseLauncher } from "./launcher-config";
import {
	type Catalog,
	featuredSchema,
	originalSchema,
	type Project,
	parseYaml,
	projectSchema,
	requestSchema,
	suiteSchema,
	type Tool,
	toolSchema,
	validateRelationships,
} from "./schemas";
import { supportedProjectSlugs } from "./suites";

export type Entry =
	| (Project & { kind: "project"; addedAt?: string })
	| (Tool & { kind: "tool"; addedAt?: string });

const root = pathToFileURL(`${process.cwd()}/`);
const repositoryRoot = new URL("../../../", root);

async function files(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const paths = await Promise.all(
		entries.map((e) =>
			e.isDirectory()
				? files(join(directory, e.name))
				: Promise.resolve(
						e.name.endsWith(".yaml") ? [join(directory, e.name)] : [],
					),
		),
	);

	return paths.flat().sort();
}

async function records<S extends v.GenericSchema>(
	folder: string,
	schema: S,
	key: "slug" | "original",
): Promise<v.InferOutput<S>[]> {
	return Promise.all(
		(await files(new URL(`src/content/catalog/${folder}/`, root).pathname)).map(
			async (path) => {
				const record = v.parse(schema, parseYaml(await readFile(path, "utf8")));

				if (
					typeof record !== "object" ||
					record === null ||
					(record as Record<string, unknown>)[key] !== basename(path, ".yaml")
				)
					throw new Error(`Filename must match ${key}: ${path}`);

				return record;
			},
		),
	);
}

export async function loadCatalog() {
	const [
		originals,
		projects,
		sourceTools,
		requests,
		featured,
		additionDates,
		suites,
	] = await Promise.all([
		readFile(new URL("src/content/catalog/originals.yaml", root), "utf8").then(
			(s) => v.parse(v.array(originalSchema), parseYaml(s)),
		),
		records("projects", projectSchema, "slug"),
		records("tools", toolSchema, "slug"),
		records("requests", requestSchema, "original"),
		readFile(new URL("src/content/catalog/featured.yaml", root), "utf8").then(
			(s) => v.parse(featuredSchema, parseYaml(s)),
		),
		loadAdditionDates(repositoryRoot),
		records("suites", suiteSchema, "slug"),
	]);
	const source: Catalog = {
		originals,
		projects,
		tools: sourceTools,
		requests,
		featured,
		suites,
	};

	validateRelationships(source);
	const tools = sourceTools.map((tool) => ({
		...tool,
		projects: supportedProjectSlugs(tool, suites),
	}));
	const catalog = { ...source, tools, suites };
	const launcher = parseLauncher(
		await readFile(new URL("launcher.yaml", repositoryRoot), "utf8"),
		projects.map((project) => project.slug),
	);

	// Old slugs in project redirects preserve the original catalog addition date.
	const redirects = await readFile(new URL("public/_redirects", root), "utf8");
	const previousSlugs = (slug: string) => [
		...new Set(
			redirects.split("\n").flatMap((line) => {
				const match = line.match(
					/^\/projects\/([a-z0-9-]+)\/?\s+\/projects\/([a-z0-9-]+)\/?\s+302$/,
				);

				return match?.[2] === slug ? [match[1]] : [];
			}),
		),
	];

	const entries: Entry[] = [
		...projects.map((p) => ({
			...p,
			kind: "project" as const,
			addedAt: catalogAddedAt(
				additionDates,
				"projects",
				p.slug,
				previousSlugs(p.slug),
			),
		})),
		...tools.map((t) => ({
			...t,
			kind: "tool" as const,
			addedAt: catalogAddedAt(additionDates, "tools", t.slug),
		})),
	];
	const requestDirectory = new URL("src/content/catalog/requests/", root)
		.pathname;
	const requestVendors = new Map(
		(await files(requestDirectory)).map((path) => {
			const parts = relative(requestDirectory, path).split("/");

			return [
				basename(path, ".yaml"),
				parts.length > 1 ? parts[0] : "unassigned",
			];
		}),
	);
	const recentRequests = requests
		.map((request) => ({
			...request,
			addedAt: catalogAddedAt(additionDates, "requests", request.original),
			vendor: requestVendors.get(request.original) ?? "unassigned",
		}))
		.sort(
			(a, b) =>
				(b.addedAt ?? "").localeCompare(a.addedAt ?? "") ||
				a.original.localeCompare(b.original),
		);

	return { ...catalog, launcher, entries, requests: recentRequests };
}

const metadataSchema = v.object({
	stars: v.pipe(v.number(), v.integer(), v.minValue(0)),
	forks: v.pipe(v.number(), v.integer(), v.minValue(0)),
	pushedAt: v.nullable(v.string()),
	isArchived: v.boolean(),
	fetchedAt: v.pipe(v.string(), v.isoTimestamp()),
});

export type Metadata = v.InferOutput<typeof metadataSchema>;

export async function loadMetadata(): Promise<Record<string, Metadata>> {
	try {
		const raw: unknown = JSON.parse(
			await readFile(
				new URL("cache/github-metadata.json", repositoryRoot),
				"utf8",
			),
		);
		const result = v.safeParse(
			v.object({ repositories: v.record(v.string(), v.unknown()) }),
			raw,
		);

		if (!result.success) return {};

		const metadata: Record<string, Metadata> = {};

		for (const [key, value] of Object.entries(result.output.repositories)) {
			const parsed = v.safeParse(metadataSchema, value);

			if (parsed.success) metadata[key.toLowerCase()] = parsed.output;
		}

		return metadata;
	} catch {
		return {};
	}
}

export type CatalogData = Awaited<ReturnType<typeof loadCatalog>>;

export {
	contributeUrl,
	entryUrl,
	label,
	metadataFor,
	recent,
	repositoryUrl,
} from "./presentation";
