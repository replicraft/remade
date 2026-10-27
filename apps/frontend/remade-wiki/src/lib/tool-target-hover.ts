const selector = "details[data-tool-targets]";

function target(event: Event): HTMLDetailsElement | null {
	return event.target instanceof Element
		? event.target.closest(selector)
		: null;
}

function positionList(details: HTMLDetailsElement) {
	const summary = details.querySelector("summary");
	const panel = details.querySelector<HTMLElement>("[data-tool-target-panel]");
	const content = panel?.firstElementChild;
	if (!summary || !panel || !(content instanceof HTMLElement)) return;
	const trigger = summary.getBoundingClientRect();
	const below = window.innerHeight - trigger.bottom - 12;
	const above = trigger.top - 12;
	const upwards =
		below < Math.min(288, window.innerHeight / 2) && above > below;
	panel.style.top = upwards ? "auto" : "100%";
	panel.style.bottom = upwards ? "100%" : "auto";
	content.style.maxHeight = `${Math.max(72, Math.min(288, window.innerHeight / 2, (upwards ? above : below) - 8))}px`;
}

function openList(details: HTMLDetailsElement) {
	details.open = true;
	positionList(details);
}

function closeWhenOutside(details: HTMLDetailsElement) {
	if (!details.matches(":hover, :focus-within")) details.open = false;
}

document.addEventListener("pointerover", (event) => {
	const details = target(event);
	if (details && event.pointerType === "mouse") openList(details);
});

document.addEventListener("pointerout", (event) => {
	const details = target(event);
	if (
		details &&
		!(
			event.relatedTarget instanceof Node &&
			details.contains(event.relatedTarget)
		)
	) {
		setTimeout(() => closeWhenOutside(details), 150);
	}
});

document.addEventListener("focusin", (event) => {
	const details = target(event);
	if (
		details &&
		event.target instanceof Element &&
		event.target.matches("summary:focus-visible")
	) {
		openList(details);
	}
});

document.addEventListener("focusout", (event) => {
	const details = target(event);
	if (details) queueMicrotask(() => closeWhenOutside(details));
});

document.addEventListener("pointerdown", (event) => {
	for (const details of document.querySelectorAll<HTMLDetailsElement>(
		`${selector}[open]`,
	)) {
		if (event.target instanceof Node && !details.contains(event.target))
			details.open = false;
	}
});

document.addEventListener("keydown", (event) => {
	if (event.key !== "Escape") return;
	for (const details of document.querySelectorAll<HTMLDetailsElement>(
		`${selector}[open]`,
	)) {
		if (details.contains(document.activeElement))
			details.querySelector("summary")?.focus();
		details.open = false;
	}
});

document.addEventListener(
	"toggle",
	(event) => {
		if (
			event.target instanceof HTMLDetailsElement &&
			event.target.matches(selector) &&
			event.target.open
		)
			positionList(event.target);
	},
	true,
);

function repositionLists() {
	for (const details of document.querySelectorAll<HTMLDetailsElement>(
		`${selector}[open]`,
	))
		positionList(details);
}
window.addEventListener("resize", repositionLists);
document.addEventListener("scroll", repositionLists, true);
