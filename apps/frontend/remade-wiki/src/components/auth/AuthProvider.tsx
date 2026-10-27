import { type ReactNode, useEffect, useState } from "react";
import * as v from "valibot";
import { accountSchema } from "../../lib/auth";
import { AuthContext, createAuthStore } from "../../stores/auth-store.ts";

export default function AuthProvider({ children }: { children: ReactNode }) {
	const [store] = useState(createAuthStore);

	useEffect(() => {
		const synchronize = (event: Event) => {
			if (!(event instanceof CustomEvent)) return;
			const account = v.safeParse(
				v.nullable(accountSchema),
				event.detail as unknown,
			);
			if (account.success) store.getState().synchronize(account.output);
		};
		document.addEventListener("remade-auth-changed", synchronize);
		return () =>
			document.removeEventListener("remade-auth-changed", synchronize);
	}, [store]);

	return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}
