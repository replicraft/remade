import { ChevronDown, LogIn } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import ProviderLinks from "./ProviderLinks";

export default function LoginButton({
	discordEnabled,
}: {
	discordEnabled?: boolean;
}) {
	const dropdown = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const panelId = useId();

	useEffect(() => {
		const dismiss = (event: PointerEvent) => {
			if (
				dropdown.current &&
				event.target instanceof Node &&
				!dropdown.current.contains(event.target)
			) {
				setOpen(false);
			}
		};
		const dismissWithEscape = (event: KeyboardEvent) => {
			if (
				event.key === "Escape" &&
				dropdown.current?.contains(document.activeElement)
			) {
				setOpen(false);
				trigger.current?.focus();
			}
		};
		document.addEventListener("pointerdown", dismiss);
		document.addEventListener("keydown", dismissWithEscape);
		return () => {
			document.removeEventListener("pointerdown", dismiss);
			document.removeEventListener("keydown", dismissWithEscape);
		};
	}, []);

	return (
		<div className="relative" ref={dropdown}>
			<button
				aria-controls={panelId}
				aria-expanded={open}
				className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-3 text-sm font-semibold hover:border-lime focus-visible:outline-2 focus-visible:outline-lime"
				onClick={() => setOpen(!open)}
				ref={trigger}
				type="button"
			>
				<LogIn aria-hidden="true" size={16} />
				Login
				<ChevronDown
					aria-hidden="true"
					className={open ? "rotate-180" : undefined}
					size={14}
				/>
			</button>
			<div
				className="absolute right-0 top-full z-40 mt-3 w-72 max-w-[calc(100vw-36px)] rounded-xl border border-line bg-surface p-2 shadow-xl"
				hidden={!open}
				id={panelId}
			>
				<ProviderLinks discordEnabled={discordEnabled} />
			</div>
		</div>
	);
}
