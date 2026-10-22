import { ChevronDown, ChevronUp, LogOut } from "lucide-react";
import Dropdown from "react-dropdown";
import { accountUsername } from "../../lib/auth";
import { useAuthStore } from "../../stores/auth-store.ts";
import UserAvatar from "./UserAvatar";

export default function UserDropdown() {
	const account = useAuthStore((state) => state.account);
	const busy = useAuthStore((state) => state.busy);
	const message = useAuthStore((state) => state.message);
	const signOut = useAuthStore((state) => state.signOut);
	const username = accountUsername(account);
	const name = account?.displayName || username || "Account";

	if (!account) return null;

	return (
		<div className="group/auth-dropdown relative">
			<Dropdown
				aria-label={`Account menu for ${name}`}
				arrowClosed={<ChevronDown aria-hidden="true" size={16} />}
				arrowOpen={<ChevronUp aria-hidden="true" size={16} />}
				baseClassName="AuthDropdown"
				controlClassName="inline-flex items-center gap-2 rounded-full border border-line p-1.5 pr-3 hover:border-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
				menuClassName="absolute right-0 top-full z-30 mt-3 w-64 max-w-[calc(100vw-36px)] overflow-hidden rounded-xl border border-line bg-panel p-2 shadow-xl"
				onChange={() => void signOut()}
				optionClassName={(_option, { active }) =>
					`mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${busy ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-surface hover:text-lime"} ${active && !busy ? "group-has-[:focus-visible]/auth-dropdown:bg-surface group-has-[:focus-visible]/auth-dropdown:text-lime" : ""}`
				}
				options={[
					{
						type: "group",
						name: (
							<div className="border-b border-line px-2 pb-3 pt-1">
								<p className="text-xs text-muted">Signed in as</p>
								<p className="mt-1 break-words font-semibold">{name}</p>
								{username && (
									<p className="mt-1 break-words text-sm text-muted">
										@{username}
									</p>
								)}
							</div>
						),
						items: [
							{
								value: "logout",
								disabled: busy,
								label: (
									<>
										<LogOut aria-hidden="true" size={16} />
										{busy ? "Logging out…" : "Logout"}
									</>
								),
							},
						],
					},
				]}
				placeholder={<UserAvatar name={name} />}
				value={null}
			/>

			{message && (
				<p className="mt-2 max-w-64 text-sm text-muted" role="status">
					{message}
				</p>
			)}
		</div>
	);
}
