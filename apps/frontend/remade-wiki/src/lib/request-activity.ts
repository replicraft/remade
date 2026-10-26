import * as v from "valibot";
import { apiUrl } from "./auth";

const count = v.pipe(v.number(), v.integer(), v.minValue(0));
const activitySchema = v.object({
	original: v.string(),
	upvotes: count,
	builders: count,
	upvoted: v.boolean(),
	building: v.boolean(),
});
const payloadSchema = v.object({ requests: v.array(activitySchema) });

export type RequestActivity = v.InferOutput<typeof activitySchema>;
export type RequestAction = "upvote" | "unvote" | "build" | "unbuild";

export async function readRequestActivity(
	signal?: AbortSignal,
	originals: readonly string[] = [],
) {
	if (import.meta.env.DEV)
		return (await import("./request-activity-preview")).readPreviewActivity();
	const read = async (original?: string) => {
		const query = original ? `?original=${encodeURIComponent(original)}` : "";
		const response = await fetch(`${apiUrl}/requests/activity${query}`, {
			credentials: "include",
			cache: "no-store",
			signal,
		});
		if (!response.ok) throw new Error("Request activity unavailable");
		return v.parse(payloadSchema, await response.json()).requests;
	};
	let items = await read();
	const ids = new Set(items.map((item) => item.original));
	const missing = originals.find((original) => !ids.has(original));
	if (missing) {
		items = await read(missing);
		const refreshed = new Set(items.map((item) => item.original));
		if (originals.some((original) => !refreshed.has(original))) {
			throw new Error("Request catalog is out of sync");
		}
	}
	return items;
}

export async function changeRequestActivity(
	original: string,
	action: RequestAction,
) {
	if (import.meta.env.DEV)
		return (await import("./request-activity-preview")).changePreviewActivity(
			original,
			action,
		);
	const response = await fetch(
		`${apiUrl}/requests/${encodeURIComponent(original)}/${action}`,
		{ method: "POST", credentials: "include" },
	);

	if (response.status === 401) return false;
	if (!response.ok)
		throw new Error("Couldn’t save your change. Please try again.");

	return true;
}
