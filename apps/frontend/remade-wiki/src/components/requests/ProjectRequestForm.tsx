import { useEffect, useRef, useState } from "react";
import { categories } from "../../lib/constants";
import type { SearchRecord } from "../../lib/directory";
import { searchDirectory } from "../../lib/directory";
import { label, repositoryUrl } from "../../lib/presentation";
import {
	type DraftErrors,
	draftKey,
	emptyDraft,
	type RequestDraft,
	restoreDraft,
	type SubmissionReceipt,
	saveDraft,
	submissionPayload,
	validateDraft,
} from "../../lib/request-draft";
import type { PreviewOutcome } from "../../lib/request-preview";

export default function ProjectRequestForm({
	records,
	policyVersion,
}: {
	records: SearchRecord[];
	policyVersion: string;
}) {
	const [draft, setDraft] = useState<RequestDraft>(emptyDraft);
	const [ready, setReady] = useState(false);
	const [intent, setIntent] = useState("");
	const [account, setAccount] = useState("");
	const [errors, setErrors] = useState<DraftErrors>({});
	const [message, setMessage] = useState("");
	const [storageError, setStorageError] = useState(false);
	const [sending, setSending] = useState(false);
	const [receipt, setReceipt] = useState<SubmissionReceipt>();
	const [outcome, setOutcome] = useState<PreviewOutcome>("delivered");
	const [loginOutcome, setLoginOutcome] = useState("success");
	const summary = useRef<HTMLDivElement>(null);
	const resultHeading = useRef<HTMLHeadingElement>(null);
	const locked = receipt !== undefined;
	useEffect(() => {
		if (!import.meta.env.DEV) return;
		try {
			const restored = restoreDraft(
				sessionStorage.getItem(draftKey),
				policyVersion,
			);
			const params = new URLSearchParams(location.search);
			setDraft(
				restored?.draft ?? {
					...emptyDraft,
					software_name: (params.get("name") ?? "").slice(0, 160),
				},
			);
			setIntent(restored?.intent ?? crypto.randomUUID());
			setReceipt(restored?.receipt);
			const login = params.get("preview_login");
			if (login === "success" || login === "changed")
				setAccount(
					login === "changed" ? "another-preview-user" : "preview-contributor",
				);
			if (login === "cancelled")
				setMessage("Sign-in was not completed. Your draft is still here.");
			if (login === "expired")
				setMessage("Your session expired. Sign in again to submit this draft.");
			if (restored)
				setMessage(
					login === "cancelled"
						? "Sign-in was not completed. Your draft is still here."
						: login === "expired"
							? "Your session expired. Sign in again to submit this draft."
							: "Your saved draft has been restored.",
				);
			if (login) {
				params.delete("preview_login");
				history.replaceState(
					null,
					"",
					`${location.pathname}${params.size ? `?${params}` : ""}`,
				);
			}
		} catch {
			setStorageError(true);
			setIntent(crypto.randomUUID());
		}
		setReady(true);
	}, [policyVersion]);
	useEffect(() => {
		if (!ready || !import.meta.env.DEV) return;
		try {
			saveDraft(sessionStorage, draft, policyVersion, intent, receipt);
			setStorageError(false);
		} catch {
			setStorageError(true);
		}
	}, [draft, policyVersion, intent, receipt, ready]);
	useEffect(() => {
		if (receipt) resultHeading.current?.focus();
	}, [receipt]);
	const update = <K extends keyof RequestDraft>(
		key: K,
		value: RequestDraft[K],
	) => setDraft((previous) => ({ ...previous, [key]: value }));
	const validate = () => {
		const next = validateDraft(draft);
		setErrors(next);
		if (Object.keys(next).length) {
			setTimeout(() => summary.current?.focus(), 0);
			return false;
		}
		return true;
	};
	const matches = searchDirectory(records, draft.software_name).slice(0, 4);
	const submit = async () => {
		if (!import.meta.env.DEV || sending || locked || !validate()) return;
		if (!account) {
			if (storageError) {
				setMessage(
					"This browser could not save your draft for sign-in. Copy your text before continuing.",
				);
				return;
			}
			try {
				saveDraft(sessionStorage, draft, policyVersion, intent);
			} catch {
				setStorageError(true);
				return;
			}
			location.assign(
				`/requests/new/?preview_login=${encodeURIComponent(loginOutcome)}`,
			);
			return;
		}
		setSending(true);
		setMessage("Sending your request for review...");
		try {
			const adapter = await import("../../lib/request-preview");
			const result = await adapter.submitPreview(
				submissionPayload(draft, policyVersion),
				intent,
				outcome,
			);
			setReceipt(result);
			if (result.delivery === "delivered")
				setDraft((previous) => ({
					...emptyDraft,
					software_name: previous.software_name,
				}));
			setMessage("");
		} catch (error) {
			const code = error instanceof Error ? error.message : "unavailable";
			setMessage(
				code === "session-expired"
					? "Your session expired. Sign in again to submit this draft."
					: code === "rate-limited"
						? "Please wait before submitting another request. Your draft is still here."
						: "The request could not be sent. Your draft is still here. Try again when the problem is resolved.",
			);
			if (code === "session-expired") setAccount("");
		} finally {
			setSending(false);
		}
	};
	const check = async () => {
		if (!receipt || sending || !import.meta.env.DEV) return;
		setSending(true);
		try {
			const adapter = await import("../../lib/request-preview");
			setReceipt(await adapter.checkPreview(receipt));
			setDraft((previous) => ({
				...emptyDraft,
				software_name: previous.software_name,
			}));
		} finally {
			setSending(false);
		}
	};
	if (!import.meta.env.DEV)
		return (
			<p>
				This preview form is available only in local development.{" "}
				<a href={`${repositoryUrl}/issues/new?template=project-request.yml`}>
					Use the GitHub Project Request form ↗
				</a>
			</p>
		);
	const fieldError = (key: keyof RequestDraft) =>
		errors[key] ? (
			<p className="field-error" id={`${key}-error`}>
				{errors[key]}
			</p>
		) : null;
	return (
		<>
			<div className="mb-8 rounded-lg border border-line bg-panel p-4 text-sm">
				<strong>Local submission preview.</strong> Authentication and delivery
				are simulated. No GitHub Issue is created.
			</div>
			<div className="grid items-start gap-12 min-[950px]:grid-cols-[minmax(0,1fr)_280px]">
				<div>
					{receipt && (
						<section
							aria-live="polite"
							className="!mt-0 mb-8 rounded-xl border border-line bg-surface p-6"
						>
							<h2 ref={resultHeading} tabIndex={-1}>
								{receipt.delivery === "delivered"
									? "Request submitted"
									: receipt.delivery === "processing"
										? "Still checking delivery"
										: "We could not confirm delivery yet"}
							</h2>
							<p>
								{receipt.delivery === "delivered"
									? "Your request has been sent to the maintainers for review. It has not been added to the public directory yet."
									: "Your draft is saved. Check this submission's status before trying to send it again."}
							</p>
							<p>
								<strong>Preview only. No GitHub Issue was created.</strong>
							</p>
							<p className="break-all text-xs">
								Receipt: {receipt.submission_id}
							</p>
							<p>{draft.software_name}</p>
							{receipt.delivery !== "delivered" && (
								<button
									className="action-primary"
									disabled={sending}
									onClick={() => void check()}
									type="button"
								>
									Check status
								</button>
							)}
							<a className="ml-4 inline-block py-3 text-sm" href="/requests/">
								Browse requests →
							</a>
						</section>
					)}
					<form
						noValidate
						onSubmit={(event) => {
							event.preventDefault();
							void submit();
						}}
					>
						{Object.keys(errors).length > 0 && (
							<div
								className="mb-6 rounded-lg border border-red-300 p-4"
								ref={summary}
								role="alert"
								tabIndex={-1}
							>
								<h2 className="!mb-3 text-lg">Please check your request</h2>
								<ul>
									{Object.entries(errors).map(([key, error]) => (
										<li key={key}>
											<a className="text-sm underline" href={`#${key}`}>
												{error}
											</a>
										</li>
									))}
								</ul>
							</div>
						)}
						<fieldset
							className="min-w-0 border-0 p-0"
							disabled={sending || locked}
						>
							<div className="form-field">
								<label htmlFor="software_name">Software name</label>
								<input
									aria-describedby={
										errors.software_name ? "software_name-error" : undefined
									}
									aria-invalid={Boolean(errors.software_name)}
									autoComplete="off"
									id="software_name"
									onChange={(event) =>
										update("software_name", event.target.value)
									}
									placeholder="The software you would like remade"
									required
									value={draft.software_name}
								/>
								{fieldError("software_name")}
							</div>
							{matches.length > 0 && (
								<div className="mb-6 rounded-lg border border-line bg-surface p-4">
									<h2 className="!mb-2 text-base">
										This may already be covered
									</h2>
									<p className="text-sm">
										Check these projects and requests. You can continue if your
										request has a different scope.
									</p>
									<ul className="space-y-3">
										{matches.map((record) => (
											<li key={`${record.kind}-${record.id}`}>
												<a className="text-sm underline" href={record.href}>
													{record.name}
												</a>
												<span className="ml-2 text-xs text-muted">
													{record.kind === "request"
														? "Project Request"
														: "Existing project"}
												</span>
											</li>
										))}
									</ul>
								</div>
							)}
							<div className="form-field">
								<label htmlFor="description">
									What matters to you (optional)
								</label>
								<textarea
									aria-describedby={
										errors.description ? "description-error" : undefined
									}
									aria-invalid={Boolean(errors.description)}
									id="description"
									onChange={(event) =>
										update("description", event.target.value)
									}
									placeholder="Which workflows, formats, or behaviors matter to you?"
									value={draft.description}
								/>
								{fieldError("description")}
							</div>
							<div className="form-field">
								<label htmlFor="reference_url">Reference URL (optional)</label>
								<input
									aria-describedby={
										errors.reference_url
											? "reference-help reference_url-error"
											: "reference-help"
									}
									aria-invalid={Boolean(errors.reference_url)}
									id="reference_url"
									onChange={(event) =>
										update("reference_url", event.target.value)
									}
									placeholder="https://"
									type="url"
									value={draft.reference_url}
								/>
								<p className="mt-2 text-xs" id="reference-help">
									Official site, archived page, or another useful reference.
								</p>
								{fieldError("reference_url")}
							</div>
							<div className="form-field">
								<label htmlFor="category">Category (optional)</label>
								<select
									id="category"
									onChange={(event) => update("category", event.target.value)}
									value={draft.category}
								>
									<option value="">Not sure</option>
									{categories.map((category) => (
										<option key={category} value={category}>
											{label(category)}
										</option>
									))}
								</select>
								{fieldError("category")}
							</div>
							<div className="form-field">
								<div className="flex items-start gap-3">
									<input
										aria-describedby={
											errors.policy_acknowledged
												? "policy_acknowledged-error"
												: undefined
										}
										aria-invalid={Boolean(errors.policy_acknowledged)}
										checked={draft.policy_acknowledged}
										className="mt-1 size-5 shrink-0 accent-lime"
										id="policy_acknowledged"
										onChange={(event) =>
											update("policy_acknowledged", event.target.checked)
										}
										type="checkbox"
									/>
									<label className="text-ink" htmlFor="policy_acknowledged">
										I have read and agree to follow the{" "}
										<a
											className="underline"
											href={`${repositoryUrl}/blob/main/POLICY.md`}
											rel="noopener noreferrer"
											target="_blank"
										>
											submission policy ↗
										</a>
										.
									</label>
								</div>
								{fieldError("policy_acknowledged")}
							</div>
						</fieldset>
						<p className="border-t border-line pt-5 text-sm">
							Your request and GitHub username will be public in Remade's GitHub
							repository. Maintainers review requests before they appear in the
							directory. Please do not include private information.
						</p>
						{account && (
							<p className="text-sm">
								Submitting as <strong className="text-ink">@{account}</strong>{" "}
								(simulated account)
							</p>
						)}
						{message && (
							<p
								className="rounded-lg border border-line p-4 text-sm"
								role="status"
							>
								{message}
							</p>
						)}
						{storageError && (
							<div className="mb-5 rounded-lg border border-line p-4">
								<p>
									This browser could not save your draft for sign-in. Copy your
									text before continuing.
								</p>
								<textarea
									aria-label="Copyable draft"
									className="w-full bg-deep p-3"
									readOnly
									value={`${draft.software_name}\n${draft.description}\n${draft.reference_url}`}
								/>
							</div>
						)}
						{!locked && (
							<button
								className="action-primary"
								disabled={sending || !ready}
								type="submit"
							>
								{sending
									? "Sending..."
									: account
										? "Submit request"
										: "Continue with GitHub"}
							</button>
						)}
					</form>
				</div>
				<aside className="rounded-xl border border-line bg-surface p-6">
					<h2 className="!mb-4 text-xl">What happens next</h2>
					<ol className="list-decimal space-y-4 pl-5 text-sm text-muted">
						<li>Search for an existing project or request.</li>
						<li>Describe what matters to you and sign in with GitHub.</li>
						<li>
							Submit for maintainer review. Acceptance does not promise
							development.
						</li>
					</ol>
					<p className="!mb-0 mt-5 text-xs">
						No repository or technical specification is needed to start a
						request.
					</p>
				</aside>
			</div>
			<details className="mt-12 rounded-lg border border-dashed border-line p-4">
				<summary className="cursor-pointer text-sm text-muted">
					Local preview controls
				</summary>
				<p className="mt-4 text-xs">
					Development only. These scenarios never call an authentication or
					submission service.
				</p>
				<div className="grid gap-4 sm:grid-cols-2">
					<label>
						Simulated login
						<select
							onChange={(event) => setLoginOutcome(event.target.value)}
							value={loginOutcome}
						>
							<option value="success">Successful return</option>
							<option value="cancelled">Cancelled</option>
							<option value="expired">Expired</option>
							<option value="changed">Different account</option>
						</select>
					</label>
					<label>
						Simulated delivery
						<select
							onChange={(event) =>
								setOutcome(event.target.value as PreviewOutcome)
							}
							value={outcome}
						>
							{[
								"delivered",
								"uncertain",
								"processing",
								"rate-limited",
								"session-expired",
								"unavailable",
							].map((value) => (
								<option key={value} value={value}>
									{label(value)}
								</option>
							))}
						</select>
					</label>
				</div>
				<button
					className="action-secondary mt-4"
					onClick={() => {
						setReceipt(undefined);
						setIntent(crypto.randomUUID());
						setMessage("");
						setErrors({});
					}}
					type="button"
				>
					Start a new preview intent
				</button>
			</details>
		</>
	);
}
