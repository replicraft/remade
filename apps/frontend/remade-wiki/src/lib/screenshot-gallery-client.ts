export function initializeScreenshotGalleries(
	scope: ParentNode = document,
): void {
	for (const gallery of scope.querySelectorAll<HTMLElement>(
		"[data-screenshot-gallery]",
	)) {
		if (gallery.dataset.galleryReady) continue;
		gallery.dataset.galleryReady = "true";

		for (const image of gallery.querySelectorAll<HTMLImageElement>(
			"[data-gallery-image]",
		)) {
			const showFallback = () => {
				image.hidden = true;
				const fallback = image.parentElement?.querySelector<HTMLElement>(
					"[data-gallery-fallback]",
				);
				if (fallback) fallback.hidden = false;
			};

			image.addEventListener("error", showFallback);
			if (image.complete && image.naturalWidth === 0) showFallback();
		}

		const track = gallery.querySelector<HTMLElement>("[data-gallery-track]");
		const slides = [
			...gallery.querySelectorAll<HTMLElement>("[data-gallery-slide]"),
		];

		if (!track || slides.length < 2) continue;

		const buttons = [
			...gallery.querySelectorAll<HTMLButtonElement>(
				"[data-gallery-direction]",
			),
		];
		const thumbnails = [
			...gallery.querySelectorAll<HTMLAnchorElement>(
				"[data-gallery-thumbnail]",
			),
		];
		const count = gallery.querySelector<HTMLElement>("[data-gallery-count]");
		const controls = gallery.querySelector<HTMLElement>(
			"[data-gallery-controls]",
		);
		let active = 0;

		function update() {
			if (!track) return;

			const left = track.getBoundingClientRect().left;
			active = slides.reduce(
				(nearest, slide, index) =>
					Math.abs(slide.getBoundingClientRect().left - left) <
					Math.abs(slides[nearest].getBoundingClientRect().left - left)
						? index
						: nearest,
				0,
			);

			const position = `${active + 1} / ${slides.length}`;

			if (count && count.textContent !== position) count.textContent = position;

			for (const button of buttons) {
				button.disabled =
					button.dataset.galleryDirection === "previous"
						? active === 0
						: active === slides.length - 1;
			}

			for (const [index, thumbnail] of thumbnails.entries()) {
				if (index === active) thumbnail.setAttribute("aria-current", "true");
				else thumbnail.removeAttribute("aria-current");
			}
		}

		function goTo(index: number) {
			if (!track) return;

			const target = slides[Math.max(0, Math.min(index, slides.length - 1))];

			track.scrollTo({
				left:
					track.scrollLeft +
					target.getBoundingClientRect().left -
					track.getBoundingClientRect().left,
				behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
					? "instant"
					: "smooth",
			});
		}

		for (const button of buttons) {
			button.addEventListener("click", () =>
				goTo(
					active + (button.dataset.galleryDirection === "previous" ? -1 : 1),
				),
			);
		}

		for (const [index, thumbnail] of thumbnails.entries()) {
			thumbnail.addEventListener("click", (event) => {
				event.preventDefault();
				goTo(index);
			});
		}

		track.addEventListener("keydown", (event) => {
			if (event.target !== track) return;

			const destination = {
				ArrowLeft: active - 1,
				ArrowRight: active + 1,
				Home: 0,
				End: slides.length - 1,
			}[event.key];

			if (destination !== undefined) {
				event.preventDefault();
				goTo(destination);
			}
		});

		track.addEventListener("scroll", update, { passive: true });
		new ResizeObserver(update).observe(track);
		if (controls) controls.hidden = false;
		update();
	}
}
