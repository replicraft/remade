import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import RequestActions from "../../src/components/requests/RequestActions";
import {
	createRequestActivityStore,
	RequestActivityContext,
} from "../../src/stores/request-activity-store";

describe("request engagement controls", () => {
	it("shows separate totals and lets selected indications be withdrawn", async () => {
		const store = createRequestActivityStore();
		const change = vi.fn().mockResolvedValue(undefined);
		store.setState({
			ready: true,
			change,
			activity: {
				example: {
					original: "example",
					upvotes: 7,
					builders: 2,
					upvoted: true,
					building: true,
				},
			},
		});
		const screen = await render(
			<RequestActivityContext.Provider value={store}>
				<RequestActions original="example" />
			</RequestActivityContext.Provider>,
		);
		const upvote = screen.getByRole("button", { name: "Upvote 7" });
		await expect.element(upvote).toHaveAttribute("aria-pressed", "true");
		await upvote.click();
		expect(change).toHaveBeenCalledWith("example", "unvote");

		await screen.getByRole("button", { name: "I’m building this 2" }).click();
		expect(change).toHaveBeenCalledWith("example", "unbuild");
	});

	it("shows unavailable counts instead of zeros while loading", async () => {
		const store = createRequestActivityStore();
		const screen = await render(
			<RequestActivityContext.Provider value={store}>
				<RequestActions original="example" />
			</RequestActivityContext.Provider>,
		);

		await expect
			.element(screen.getByRole("button", { name: "Upvote Unavailable" }))
			.toBeDisabled();
		await expect
			.element(
				screen.getByRole("button", { name: "I’m building this Unavailable" }),
			)
			.toBeDisabled();
	});
});
