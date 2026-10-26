// Imported only by the development form. This adapter never makes a network request.
import type { SubmissionReceipt, submissionPayload } from "./request-draft";
export type PreviewOutcome =
	| "delivered"
	| "uncertain"
	| "processing"
	| "rate-limited"
	| "session-expired"
	| "unavailable";
export async function submitPreview(
	_payload: ReturnType<typeof submissionPayload>,
	intent: string,
	outcome: PreviewOutcome,
): Promise<SubmissionReceipt> {
	await new Promise((resolve) => setTimeout(resolve, 600));
	if (
		outcome === "rate-limited" ||
		outcome === "session-expired" ||
		outcome === "unavailable"
	)
		throw new Error(outcome);
	return {
		submission_id: intent,
		delivery: outcome,
		review: outcome === "delivered" ? "pending" : "unknown",
		publication: "not_confirmed",
		issue_url: null,
		published_url: null,
	};
}
export async function checkPreview(
	receipt: SubmissionReceipt,
): Promise<SubmissionReceipt> {
	await new Promise((resolve) => setTimeout(resolve, 300));
	return { ...receipt, delivery: "delivered", review: "pending" };
}
