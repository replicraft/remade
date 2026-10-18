import type { RequestAction, RequestActivity } from "./request-activity";

const key = "remade.preview-activity";
export async function readPreviewActivity(): Promise<RequestActivity[]> {
	const response = await fetch("/data/requests.json");
	if (!response.ok) throw new Error("Preview counters unavailable");
	const data = (await response.json()) as { requests: { original: string }[] };
	let stored: Record<string, { upvoted: boolean; building: boolean }> = {};
	try {
		stored = JSON.parse(sessionStorage.getItem(key) ?? "{}");
	} catch {
		/* Keep preview counters usable if storage is unavailable. */
	}
	return data.requests.map((request) => ({
		original: request.original,
		upvotes: stored[request.original]?.upvoted ? 1 : 0,
		builders: stored[request.original]?.building ? 1 : 0,
		upvoted: stored[request.original]?.upvoted ?? false,
		building: stored[request.original]?.building ?? false,
	}));
}
export function changePreviewActivity(original: string, action: RequestAction) {
	const stored = JSON.parse(sessionStorage.getItem(key) ?? "{}") as Record<
		string,
		{ upvoted: boolean; building: boolean }
	>;
	const current = stored[original] ?? { upvoted: false, building: false };
	stored[original] = {
		upvoted:
			action === "upvote"
				? true
				: action === "unvote"
					? false
					: current.upvoted,
		building:
			action === "build"
				? true
				: action === "unbuild"
					? false
					: current.building,
	};
	sessionStorage.setItem(key, JSON.stringify(stored));
	return true;
}
