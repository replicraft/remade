import { LogIn } from "lucide-react";
import { loginUrl } from "../../lib/auth";

export default function LoginButton() {
	return (
		<a
			className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-3 font-semibold hover:border-lime"
			href={loginUrl}
		>
			<LogIn aria-hidden="true" size={16} />
			Login
		</a>
	);
}
