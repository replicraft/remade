import { useRef, useState } from "react";
import { label } from "../../lib/presentation";
export interface FilterOption {
	key: string;
	name: string;
	values: { value: string; name: string }[];
}
export default function DirectoryFilters({
	filters,
	options,
	onApply,
	onReset,
}: {
	filters: Record<string, string>;
	options: FilterOption[];
	onApply: (filters: Record<string, string>) => void;
	onReset: () => void;
}) {
	const dialog = useRef<HTMLDialogElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const [draft, setDraft] = useState(filters);
	const close = () => {
		dialog.current?.close();
		trigger.current?.focus();
	};
	const open = () => {
		setDraft({ ...filters });
		dialog.current?.showModal();
	};
	const active = Object.entries(filters).filter(
		([key, value]) => !["q", "sort", "page"].includes(key) && value,
	).length;
	return (
		<>
			<button
				className="action-secondary"
				onClick={open}
				ref={trigger}
				type="button"
			>
				Filters{active ? ` (${active})` : ""}
			</button>
			<dialog
				aria-labelledby="filter-title"
				className="filter-dialog"
				onCancel={close}
				onClose={() => trigger.current?.focus()}
				ref={dialog}
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						onApply(draft);
						close();
					}}
				>
					<div className="mb-6 flex items-center justify-between gap-3">
						<h2 className="!mb-0" id="filter-title">
							Filters
						</h2>
						<button className="action-secondary" onClick={close} type="button">
							Close
						</button>
					</div>
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
						{options.map((option) => (
							<label key={option.key}>
								{option.name}
								<select
									onChange={(event) =>
										setDraft((previous) => ({
											...previous,
											[option.key]: event.target.value,
										}))
									}
									value={draft[option.key] ?? ""}
								>
									<option value="">
										{option.key === "sort"
											? "Default order"
											: `All ${option.name.toLowerCase()}`}
									</option>
									{option.values.map((value) => (
										<option key={value.value} value={value.value}>
											{value.name || label(value.value)}
										</option>
									))}
								</select>
							</label>
						))}
					</div>
					<div className="mt-8 flex flex-wrap justify-between gap-3">
						<button
							className="action-secondary"
							onClick={() => setDraft({ q: filters.q, sort: filters.sort })}
							type="button"
						>
							Reset
						</button>
						<div className="flex flex-wrap gap-3">
							<button
								className="action-secondary"
								onClick={close}
								type="button"
							>
								Cancel
							</button>
							<button className="action-primary" type="submit">
								Show results
							</button>
						</div>
					</div>
				</form>
			</dialog>
			{active > 0 && (
				<button
					className="py-3 text-sm text-muted"
					onClick={onReset}
					type="button"
				>
					Clear filters
				</button>
			)}
		</>
	);
}
