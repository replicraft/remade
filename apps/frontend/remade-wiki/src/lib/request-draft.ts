import * as v from "valibot";
import { categories } from "./constants";
import { publicHttps } from "./schemas";
export const draftKey = "remade.project-request.v1";
export const draftLifetime = 24 * 60 * 60 * 1000;
export interface RequestDraft {
	software_name: string;
	description: string;
	reference_url: string;
	category: string;
	policy_acknowledged: boolean;
}
export const emptyDraft: RequestDraft = {
	software_name: "",
	description: "",
	reference_url: "",
	category: "",
	policy_acknowledged: false,
};
export type DraftErrors = Partial<Record<keyof RequestDraft, string>>;
export interface SubmissionReceipt {
	submission_id: string;
	delivery: "delivered" | "processing" | "uncertain";
	review: "pending" | "unknown";
	publication: "not_confirmed";
	issue_url: null;
	published_url: null;
}
export function validateDraft(draft: RequestDraft): DraftErrors {
	const errors: DraftErrors = {};
	const length = Array.from(draft.software_name.trim()).length;
	if (length < 1 || length > 160)
		errors.software_name = "Enter the software name using 1 to 160 characters.";
	if (Array.from(draft.description).length > 4000)
		errors.description = "Keep the explanation within 4,000 characters.";
	if (
		draft.reference_url &&
		(draft.reference_url.length > 2048 || !publicHttps(draft.reference_url))
	)
		errors.reference_url =
			"Enter a public HTTPS reference URL, or leave this optional field blank.";
	if (
		draft.category &&
		!categories.includes(draft.category as (typeof categories)[number])
	)
		errors.category = "Choose a listed category, or Not sure.";
	if (!draft.policy_acknowledged)
		errors.policy_acknowledged =
			"Please read and acknowledge the submission policy before submitting.";
	return errors;
}
const envelopeSchema = v.object({
	version: v.literal(1),
	savedAt: v.number(),
	policyVersion: v.string(),
	intent: v.string(),
	draft: v.object({
		software_name: v.string(),
		description: v.string(),
		reference_url: v.string(),
		category: v.string(),
		policy_acknowledged: v.boolean(),
	}),
	receipt: v.optional(
		v.object({
			submission_id: v.string(),
			delivery: v.picklist(["delivered", "processing", "uncertain"]),
			review: v.picklist(["pending", "unknown"]),
			publication: v.literal("not_confirmed"),
			issue_url: v.null(),
			published_url: v.null(),
		}),
	),
});
export function restoreDraft(
	source: string | null,
	policyVersion: string,
	now = Date.now(),
) {
	if (!source || source.length > 20000) return null;
	try {
		const result = v.safeParse(envelopeSchema, JSON.parse(source));
		if (
			!result.success ||
			now - result.output.savedAt > draftLifetime ||
			result.output.savedAt > now
		)
			return null;
		return {
			...result.output,
			draft: {
				...result.output.draft,
				policy_acknowledged:
					result.output.policyVersion === policyVersion &&
					result.output.draft.policy_acknowledged,
			},
		};
	} catch {
		return null;
	}
}
export function saveDraft(
	storage: Pick<Storage, "setItem">,
	draft: RequestDraft,
	policyVersion: string,
	intent: string,
	receipt?: SubmissionReceipt,
) {
	storage.setItem(
		draftKey,
		JSON.stringify({
			version: 1,
			savedAt: Date.now(),
			policyVersion,
			intent,
			draft,
			receipt,
		}),
	);
}
export function submissionPayload(draft: RequestDraft, policyVersion: string) {
	return {
		type: "project-request" as const,
		software_name: draft.software_name.trim(),
		description: draft.description.trim(),
		reference_url: draft.reference_url.trim() || null,
		category: draft.category || null,
		policy_acknowledged: draft.policy_acknowledged,
		policy_version: policyVersion,
	};
}
