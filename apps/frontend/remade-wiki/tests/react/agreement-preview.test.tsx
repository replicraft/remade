import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-react";
import AgreementPreview from "../../src/components/legal/AgreementPreview";

describe("unpublished account agreement preview", () => {
	it("starts unchecked and enables only a preview continuation", async () => {
		const screen = await render(<AgreementPreview />);
		const checkbox = screen.getByRole("checkbox");
		const continueButton = screen.getByRole("button", {
			name: "Continue preview",
		});
		await expect.element(checkbox).not.toBeChecked();
		await expect.element(continueButton).toBeDisabled();
		await expect
			.element(screen.getByRole("link", { name: "Terms of Service" }))
			.toHaveAttribute("href", "/terms/");
		await expect
			.element(screen.getByRole("link", { name: "Privacy Policy" }))
			.toHaveAttribute("href", "/privacy/");
		await checkbox.click();
		await continueButton.click();
		await expect
			.element(screen.getByRole("status"))
			.toHaveTextContent("No agreement was recorded");
		await checkbox.click();
		await expect.element(continueButton).toBeDisabled();
		await expect.element(screen.getByRole("status")).not.toBeInTheDocument();
	});
});
