import { Hammer, Info, ThumbsUp } from "lucide-react";
import { useId, useState } from "react";
import { useRequestActivity } from "../../stores/request-activity-store";

export default function RequestActions({ original }: { original: string }) {
	const tooltipId = useId();
	const [showInfo, setShowInfo] = useState(false);
	const item = useRequestActivity((state) => state.activity[original]);
	const ready = useRequestActivity((state) => state.ready);
	const busy = useRequestActivity((state) => state.busy);
	const change = useRequestActivity((state) => state.change);
	const message = useRequestActivity((state) =>
		state.messageOriginal === original ? state.message : "",
	);

	const button =
		"inline-flex items-center gap-1.5 rounded-lg border min-h-11 px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-60";
	const inactive = "border-line hover:border-lime hover:text-lime";
	const selected = "border-lime bg-lime/10 text-lime hover:bg-lime/20";

	return (
		<div className="relative z-10 mt-3 border-t border-line pt-3">
			<div className="flex flex-wrap items-center gap-2">
				<button
					aria-pressed={item?.upvoted ?? false}
					className={`${button} ${item?.upvoted ? selected : inactive}`}
					disabled={!ready || !item || busy}
					onClick={() =>
						void change(original, item?.upvoted ? "unvote" : "upvote")
					}
					type="button"
				>
					<ThumbsUp aria-hidden="true" size={14} />
					Upvote{" "}
					<span className="tabular-nums">
						{ready && item ? item.upvotes : "Unavailable"}
					</span>
				</button>

				<div className="inline-flex items-center gap-1">
					<button
						aria-pressed={item?.building ?? false}
						className={`${button} ${item?.building ? selected : inactive}`}
						disabled={!ready || !item || busy}
						onClick={() =>
							void change(original, item?.building ? "unbuild" : "build")
						}
						type="button"
					>
						<Hammer aria-hidden="true" size={14} />
						I’m building this{" "}
						<span className="tabular-nums">
							{ready && item ? item.builders : "Unavailable"}
						</span>
					</button>

					<fieldset
						aria-label="Builder information"
						className="m-0 inline-flex min-w-0 border-0 p-0"
						onBlur={() => setShowInfo(false)}
						onFocus={() => setShowInfo(true)}
						onMouseEnter={() => setShowInfo(true)}
						onMouseLeave={() => setShowInfo(false)}
					>
						<button
							aria-describedby={showInfo ? tooltipId : undefined}
							aria-label="About I’m building this"
							className="inline-flex rounded-md p-1 text-muted transition-colors hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"
							onKeyDown={(event) => {
								if (event.key === "Escape") setShowInfo(false);
							}}
							type="button"
						>
							<Info aria-hidden="true" size={14} />
						</button>

						{showInfo && (
							<div className="absolute bottom-full left-0 z-20 w-64 max-w-full pb-2">
								<div
									className="rounded-lg border border-line bg-panel p-3 text-xs text-muted shadow-lg"
									id={tooltipId}
									role="tooltip"
								>
									Upvotes express interest. Builder indications are
									self-reported, not verified work or a reservation.
								</div>
							</div>
						)}
					</fieldset>
				</div>
			</div>

			{message && (
				<p className="mb-0 mt-3 text-xs" role="status">
					{message}
				</p>
			)}
		</div>
	);
}
