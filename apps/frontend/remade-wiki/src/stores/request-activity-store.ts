import { createContext, useContext } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { promptLoginToVote } from "../lib/auth-notifications";
import {
	changeRequestActivity,
	type RequestAction,
	type RequestActivity,
	readRequestActivity,
} from "../lib/request-activity";

interface State {
	activity: Record<string, RequestActivity>;
	ready: boolean;
	busy: boolean;
	loginRequired: string | null;
	message: string;
	messageOriginal: string | null;
	load: (signal?: AbortSignal) => Promise<void>;
	change: (original: string, action: RequestAction) => Promise<void>;
}

export function createRequestActivityStore(originals: readonly string[] = []) {
	let revision = 0;

	return createStore<State>()((set, get) => ({
		activity: {},
		ready: false,
		busy: false,
		loginRequired: null,
		message: "",
		messageOriginal: null,
		load: async (signal) => {
			const current = ++revision;

			try {
				const items = await readRequestActivity(signal, originals);
				if (signal?.aborted || current !== revision) return;

				set({
					activity: Object.fromEntries(
						items.map((item) => [item.original, item]),
					),
					ready: true,
					message: "",
					messageOriginal: null,
					loginRequired: null,
				});
			} catch {
				if (!signal?.aborted && current === revision) {
					set({
						ready: false,
						message:
							"Request counters are unavailable. Please try again later.",
						messageOriginal: null,
					});
				}
			}
		},
		change: async (original, action) => {
			if (get().busy || !get().ready) return;

			set({
				busy: true,
				message: "",
				messageOriginal: null,
				loginRequired: null,
			});

			try {
				if (!(await changeRequestActivity(original, action))) {
					set({ loginRequired: original });
					promptLoginToVote();
					return;
				}

				await get().load();
				if (!get().ready)
					set({
						message: "Your change was saved, but totals couldn’t be refreshed.",
						messageOriginal: original,
					});
			} catch {
				set({
					message: "Couldn’t save your change. Please try again.",
					messageOriginal: original,
				});
			} finally {
				set({ busy: false });
			}
		},
	}));
}

export const RequestActivityContext = createContext<ReturnType<
	typeof createRequestActivityStore
> | null>(null);

export function useRequestActivity<T>(selector: (state: State) => T) {
	const store = useContext(RequestActivityContext);
	if (!store) throw new Error("RequestActivityProvider is required");

	return useStore(store, selector);
}
