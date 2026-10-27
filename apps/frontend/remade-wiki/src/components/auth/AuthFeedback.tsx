import { useEffect, useState } from "react";
import type { Account } from "../../lib/auth";

export default function AuthFeedback({
	account,
}: {
	account?: Account | null;
}) {
	const [message, setMessage] = useState("");

	useEffect(() => {
		const query = new URLSearchParams(window.location.search);
		const error = query.get("auth_error");
		if (error === "email_in_use") {
			setMessage(
				"This verified email is already registered. Sign in with your existing method, then connect this provider in Account settings.",
			);
		} else if (error === "identity_in_use") {
			setMessage(
				"This sign-in method belongs to another Remade account. It cannot be connected to this account.",
			);
		} else {
			const provider = query.get("connected");
			setMessage(
				account?.identities.some((identity) => identity.provider === provider)
					? `${provider === "github" ? "GitHub" : "Discord"} connected.${new Set(account.identities.map((identity) => identity.provider)).size > 1 ? " You can now sign in with either method." : ""}`
					: "",
			);
		}
	}, [account]);

	return message ? (
		<p
			className="mt-5 rounded-lg border border-line bg-surface p-4 text-sm leading-6"
			role="status"
		>
			{message}
		</p>
	) : null;
}
