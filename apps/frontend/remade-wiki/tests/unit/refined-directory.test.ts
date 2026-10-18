import { beforeAll, expect, it } from "vitest";
import { loadCatalog } from "../../src/lib/catalog";
import {
	type DirectoryRecord,
	directoryRecords,
	directoryResults,
	normalizeQuery,
	pageHref,
	pageSize,
	requestHref,
	searchDirectory,
} from "../../src/lib/directory";
import {
	draftLifetime,
	emptyDraft,
	restoreDraft,
	type SubmissionReceipt,
	saveDraft,
	submissionPayload,
	validateDraft,
} from "../../src/lib/request-draft";

let records: DirectoryRecord[];
beforeAll(async () => {
	records = directoryRecords(await loadCatalog(), {});
});
it("matches target names and aliases with deterministic project/request classifications", () => {
	expect(
		searchDirectory(records, "Photoshop").some(
			(record) => record.id === "photocraft" && record.kind === "project",
		),
	).toBe(true);
	expect(searchDirectory(records, "Obsidian")[0]).toMatchObject({
		kind: "request",
		id: "obsidian",
		href: "/software/obsidian/",
	});
	expect(normalizeQuery("  Ａ  B  ")).toBe("a b");
	expect(searchDirectory(records, "  ")).toEqual([]);
});
it("preserves both community links and keeps tools distinct", () => {
	expect(records.find((record) => record.id === "earthcraft")).toMatchObject({
		discord_server: "https://discord.gg/artcraft",
		discord_thread:
			"https://discord.com/channels/1359579021108842617/1559160946625224715",
	});
	expect(
		records.find((record) => record.id === "openplayground"),
	).toMatchObject({
		kind: "tool",
		suites: [{ name: "ArtCraft Suite", href: "/suites/artcraft/" }],
	});
});
it("filters categories, keeps request-only records separate and exposes canonical page links", () => {
	expect(
		directoryResults(
			records,
			{ q: "", category: "engineering", sort: "name" },
			"project",
		).every(
			(record) =>
				record.kind !== "request" &&
				(record.category === "engineering" ||
					record.categories?.includes("engineering")),
		),
	).toBe(true);
	expect(
		directoryResults(records, { q: "", sort: "recent" }, "request").every(
			(record) => record.kind === "request",
		),
	).toBe(true);
	expect(pageSize).toBe(24);
	expect(pageHref("request", 1)).toBe("/requests/");
	expect(pageHref("project", 2)).toBe("/explore/page/2/");
	expect(requestHref("A&B / C")).toBe("/requests/new/?name=A%26B+%2F+C");
});
it("allows a one-character Unicode name and missing optional fields, but requires policy", () => {
	expect(
		validateDraft({
			...emptyDraft,
			software_name: "界",
			policy_acknowledged: true,
		}),
	).toEqual({});
	expect(validateDraft({ ...emptyDraft, software_name: "X" })).toHaveProperty(
		"policy_acknowledged",
	);
	expect(
		validateDraft({
			...emptyDraft,
			software_name: "X",
			reference_url: "javascript:alert(1)",
		}),
	).toHaveProperty("reference_url");
	expect(
		submissionPayload(
			{ ...emptyDraft, software_name: " X ", policy_acknowledged: true },
			"policy",
		),
	).toEqual({
		type: "project-request",
		software_name: "X",
		description: "",
		reference_url: null,
		category: null,
		policy_acknowledged: true,
		policy_version: "policy",
	});
});
it("restores draft and uncertain intent while expiring old data and resetting changed-policy consent", () => {
	let source = "";
	const receipt: SubmissionReceipt = {
		submission_id: "intent",
		delivery: "uncertain",
		review: "unknown",
		publication: "not_confirmed",
		issue_url: null,
		published_url: null,
	};
	saveDraft(
		{
			setItem: (_key, value) => {
				source = value;
			},
		},
		{ ...emptyDraft, software_name: "Editor", policy_acknowledged: true },
		"policy-a",
		"intent",
		receipt,
	);
	expect(restoreDraft(source, "policy-a")).toMatchObject({
		intent: "intent",
		receipt,
		draft: { policy_acknowledged: true, software_name: "Editor" },
	});
	expect(restoreDraft(source, "policy-b")).toMatchObject({
		draft: { policy_acknowledged: false, software_name: "Editor" },
	});
	expect(
		restoreDraft(source, "policy-a", Date.now() + draftLifetime + 1000),
	).toBeNull();
	expect(restoreDraft("broken", "policy-a")).toBeNull();
});
it("surfaces blocked storage instead of pretending the draft was saved", () => {
	expect(() =>
		saveDraft(
			{
				setItem: () => {
					throw new Error("blocked");
				},
			},
			emptyDraft,
			"policy",
			"intent",
		),
	).toThrow("blocked");
});

it("keeps complete card information and matches suggested request names", async () => {
	const catalog = await loadCatalog();
	const earthcraft = records.find((record) => record.id === "earthcraft");
	expect(earthcraft?.authors).toEqual([
		"therichronicles",
		"pixelsoftwarestudios",
	]);
	expect(earthcraft?.summary).toBe(
		catalog.projects.find((project) => project.slug === "earthcraft")
			?.description,
	);
	expect(
		records.find((record) => record.id === "photocraft")?.originals,
	).toContainEqual({
		name: "Adobe Photoshop",
		href: "/software/adobe-photoshop/",
	});
	const request = records.find(
		(record) => record.kind === "request" && record.suggestedNames?.length,
	);
	if (!request?.suggestedNames)
		throw new Error("Expected a request with suggested names");
	expect(
		directoryResults(
			records,
			{ q: request.suggestedNames[0], sort: "name" },
			"request",
		).map((record) => record.id),
	).toContain(request.id);
});
