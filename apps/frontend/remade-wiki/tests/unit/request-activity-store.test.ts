import { beforeEach, describe, expect, it, vi } from "vitest";
import { promptLoginToVote } from "../../src/lib/auth-notifications";
import {
	changeRequestActivity,
	readRequestActivity,
} from "../../src/lib/request-activity";
import { createRequestActivityStore } from "../../src/stores/request-activity-store";

vi.mock("../../src/lib/request-activity", () => ({
	changeRequestActivity: vi.fn(),
	readRequestActivity: vi.fn(),
}));

vi.mock("../../src/lib/auth-notifications", () => ({
	promptLoginToVote: vi.fn(),
}));

const item = {
	original: "example",
	upvotes: 3,
	builders: 1,
	upvoted: false,
	building: false,
};

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(readRequestActivity).mockResolvedValue([item]);
	vi.mocked(changeRequestActivity).mockResolvedValue(true);
});

describe("request activity", () => {
	it("supplies the published page IDs so missing entries can refresh the backend snapshot", async () => {
		const store = createRequestActivityStore(["example", "new-request"]);
		await store.getState().load();
		expect(readRequestActivity).toHaveBeenCalledWith(undefined, [
			"example",
			"new-request",
		]);
	});

	it("refreshes authoritative counts after a saved action", async () => {
		const store = createRequestActivityStore();
		await store.getState().load();
		vi.mocked(readRequestActivity).mockResolvedValue([
			{ ...item, upvotes: 4, upvoted: true },
		]);

		await store.getState().change("example", "upvote");

		expect(changeRequestActivity).toHaveBeenCalledWith("example", "upvote");
		expect(store.getState().activity.example.upvotes).toBe(4);
		expect(store.getState().activity.example.upvoted).toBe(true);
	});

	it("asks for login without incrementing counts on an unauthorized action", async () => {
		const store = createRequestActivityStore();
		await store.getState().load();
		vi.mocked(changeRequestActivity).mockResolvedValue(false);

		await store.getState().change("example", "build");

		expect(store.getState().loginRequired).toBe("example");
		expect(promptLoginToVote).toHaveBeenCalledOnce();
		expect(store.getState().activity.example.builders).toBe(1);
		expect(store.getState().busy).toBe(false);
	});

	it("does not display fabricated zero counts when loading fails", async () => {
		vi.mocked(readRequestActivity).mockRejectedValue(new Error("Offline"));
		const store = createRequestActivityStore();
		await store.getState().load();

		expect(store.getState().ready).toBe(false);
		expect(store.getState().activity).toEqual({});
		expect(store.getState().message).toContain("unavailable");
	});

	it("preserves counts on failed writes", async () => {
		const store = createRequestActivityStore();
		await store.getState().load();
		vi.mocked(changeRequestActivity).mockRejectedValue(new Error("Offline"));

		await store.getState().change("example", "upvote");

		expect(store.getState().activity.example).toEqual(item);
		expect(store.getState().message).toContain("Couldn’t save");
	});
});
