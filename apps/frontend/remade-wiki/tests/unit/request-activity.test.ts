import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readRequestActivity } from "../../src/lib/request-activity";

vi.mock("../../src/lib/auth", () => ({
	apiUrl: "https://api.remade.wiki/api/v1",
}));

const fetchActivity = vi.fn<typeof fetch>();
const item = (original: string) => ({
	original,
	upvotes: 0,
	builders: 0,
	upvoted: false,
	building: false,
});

beforeEach(() => {
	vi.stubEnv("DEV", false);
	vi.stubGlobal("fetch", fetchActivity);
	fetchActivity.mockReset();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

it("uses a single bulk read when all published IDs are present", async () => {
	fetchActivity.mockResolvedValueOnce(
		Response.json({ requests: [item("example")] }),
	);
	expect(await readRequestActivity(undefined, ["example"])).toEqual([
		item("example"),
	]);
	expect(fetchActivity).toHaveBeenCalledTimes(1);
});

it("reports one missing ID and reuses the refreshed whole snapshot", async () => {
	fetchActivity.mockResolvedValueOnce(
		Response.json({ requests: [item("existing")] }),
	);
	fetchActivity.mockResolvedValueOnce(
		Response.json({
			requests: [item("existing"), item("new-one"), item("new-two")],
		}),
	);
	const controller = new AbortController();
	const result = await readRequestActivity(controller.signal, [
		"existing",
		"new-one",
		"new-two",
	]);
	expect(result).toHaveLength(3);
	expect(fetchActivity).toHaveBeenCalledTimes(2);
	expect(fetchActivity).toHaveBeenLastCalledWith(
		"https://api.remade.wiki/api/v1/requests/activity?original=new-one",
		expect.objectContaining({
			signal: controller.signal,
			credentials: "include",
		}),
	);
});

it("does not fabricate zeros or retry indefinitely when a refresh still lacks an ID", async () => {
	fetchActivity.mockImplementation(async () => Response.json({ requests: [] }));
	await expect(readRequestActivity(undefined, ["missing"])).rejects.toThrow(
		"out of sync",
	);
	expect(fetchActivity).toHaveBeenCalledTimes(2);
});

it("preserves an unavailable response as a load failure", async () => {
	fetchActivity.mockResolvedValueOnce(Response.json({ requests: [] }));
	fetchActivity.mockResolvedValueOnce(
		new Response("Unavailable", { status: 503 }),
	);
	await expect(readRequestActivity(undefined, ["new-request"])).rejects.toThrow(
		"unavailable",
	);
});
