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

export async function readRequestActivity(signal?: AbortSignal) {
	if (import.meta.env.DEV)
		return (await import("./request-activity-preview")).readPreviewActivity();
	const response = await fetch(`${apiUrl}/requests/activity`, {
		credentials: "include",
		cache: "no-store",
		signal,
	});

	if (!response.ok) throw new Error("Request activity unavailable");

	return v.parse(payloadSchema, await response.json()).requests;
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
