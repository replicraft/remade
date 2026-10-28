import { useState } from "react";

export default function AgreementPreview() {
	const [agreed, setAgreed] = useState(false);
	const [continued, setContinued] = useState(false);

	return (
		<section
			aria-labelledby="agreement-preview-title"
			className="mt-10 max-w-xl rounded-xl border border-line bg-surface p-6"
		>
			<p className="eyebrow">Unpublished interaction preview</p>
			<h2 className="!text-2xl" id="agreement-preview-title">
				Before you use your Remade account
			</h2>
			<p className="text-sm">
				Accounts are for people aged 13 and over. Review the account Terms and
				Privacy Policy. GitHub or Discord authenticates your identity; Remade
				never receives your provider password.
			</p>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (agreed) setContinued(true);
				}}
			>
				<label className="flex items-start gap-3 text-sm leading-6">
					<input
						checked={agreed}
						className="mt-1 size-5 shrink-0 accent-lime"
						onChange={(event) => {
							setAgreed(event.target.checked);
							setContinued(false);
						}}
						required
						type="checkbox"
					/>
					<span>
						I agree to the{" "}
						<a
							className="text-lime underline"
							href="/terms/"
							rel="noopener noreferrer"
							target="_blank"
						>
							Terms of Service
						</a>{" "}
						and have read the{" "}
						<a
							className="text-lime underline"
							href="/privacy/"
							rel="noopener noreferrer"
							target="_blank"
						>
							Privacy Policy
						</a>
						.
					</span>
				</label>
				<button
					className="action-primary mt-5 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!agreed}
					type="submit"
				>
					Continue preview
				</button>
			</form>
			<p className="mb-0 mt-4 text-xs">
				Preview only. No OAuth request, account change, browser-storage record
				or legal acceptance is created.
			</p>
			{continued && (
				<p className="mt-4 text-sm text-lime" role="status">
					Preview complete. No agreement was recorded. Account-agreement
					enforcement has not been enabled.
				</p>
			)}
		</section>
	);
}
