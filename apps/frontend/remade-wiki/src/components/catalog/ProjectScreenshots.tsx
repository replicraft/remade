import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Screenshot } from "../../lib/schemas";
import { screenshotUrl } from "../../lib/screenshots";

export type ScreenshotVariant = "filmstrip" | "peek" | "compact";

interface Props {
	projectSlug: string;
	projectName: string;
	screenshots?: Screenshot[];
	variant?: ScreenshotVariant;
}

export default function ProjectScreenshots({
	projectSlug,
	projectName,
	screenshots,
	variant = "filmstrip",
}: Props) {
	if (!screenshots?.length) return null;

	const multiple = screenshots.length > 1;
	const compact = variant === "compact";
	const peek = variant === "peek";

	return (
		<section
			aria-label={`${projectName} screenshots`}
			className={`my-10 min-w-0 ${compact ? "max-w-[620px]" : ""}`}
			data-screenshot-gallery
		>
			<div className="mb-4 flex items-center justify-between gap-4">
				<h2 className="!m-0 text-sm font-semibold tracking-normal text-muted">
					Screenshots
				</h2>

				{multiple && (
					<div className="flex items-center gap-3">
						<span
							aria-live="polite"
							className="text-xs tabular-nums text-muted"
							data-gallery-count
						>
							{screenshots.length} images
						</span>

						<div
							className="flex gap-1 [&[hidden]]:hidden"
							data-gallery-controls
							hidden
						>
							{(["previous", "next"] as const).map((direction) => (
								<button
									aria-label={`${direction === "previous" ? "Previous" : "Next"} screenshot`}
									className="inline-flex size-8 items-center justify-center rounded-full text-ink hover:bg-surface hover:text-lime disabled:cursor-default disabled:text-muted/40 disabled:hover:bg-transparent"
									data-gallery-direction={direction}
									key={direction}
									type="button"
								>
									{direction === "previous" ? (
										<ArrowLeft size={16} />
									) : (
										<ArrowRight size={16} />
									)}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<section
				aria-label="Scrollable screenshots"
				className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain rounded-xl pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
				data-gallery-track
				tabIndex={multiple ? 0 : undefined}
			>
				{screenshots.map((screenshot, index) => {
					const src = screenshotUrl(projectSlug, screenshot, index);

					return (
						<figure
							className={`!m-0 min-w-0 shrink-0 snap-start ${peek && multiple ? "basis-[88%] sm:basis-[84%]" : "basis-full"}`}
							data-gallery-slide
							id={`${projectSlug}-screenshot-${index + 1}`}
							key={src}
						>
							<a
								aria-label={`Open full-size screenshot: ${screenshot.alt}`}
								className={`group relative flex items-center justify-center overflow-hidden rounded-xl bg-black/20 ${compact ? "aspect-[16/9]" : "aspect-[16/10]"}`}
								href={src}
								rel="noopener noreferrer"
								target="_blank"
							>
								<img
									alt={screenshot.alt}
									className="!m-0 h-full w-full object-contain"
									data-gallery-image
									decoding="async"
									loading="lazy"
									referrerPolicy="no-referrer"
									src={src}
								/>
								<span
									className="px-6 text-center text-sm text-muted [&[hidden]]:hidden"
									data-gallery-fallback
									hidden
								>
									Screenshot unavailable. {screenshot.alt}
								</span>
								<span
									aria-hidden="true"
									className="absolute right-3 bottom-3 inline-flex size-8 items-center justify-center rounded-full bg-canvas/90 text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
								>
									<ArrowUpRight size={16} />
								</span>
							</a>

							{screenshot.caption && (
								<figcaption className="mt-3 text-sm leading-6 text-muted">
									{screenshot.caption}
								</figcaption>
							)}
						</figure>
					);
				})}
			</section>

			{multiple && variant === "filmstrip" && (
				<nav
					aria-label="Choose a screenshot"
					className="mt-3 flex gap-2 overflow-x-auto py-1"
				>
					{screenshots.map((screenshot, index) => (
						<a
							aria-current={index === 0 ? "true" : undefined}
							aria-label={`Screenshot ${index + 1}: ${screenshot.alt}`}
							className="block w-24 shrink-0 overflow-hidden rounded-md opacity-55 outline-offset-2 transition-opacity hover:opacity-100 aria-[current=true]:opacity-100 aria-[current=true]:outline-2 aria-[current=true]:outline-lime motion-reduce:transition-none"
							data-gallery-thumbnail={index}
							href={`#${projectSlug}-screenshot-${index + 1}`}
							key={screenshot.src}
						>
							<img
								alt=""
								className="!m-0 aspect-[16/10] w-full bg-black/20 object-contain"
								decoding="async"
								loading="lazy"
								referrerPolicy="no-referrer"
								src={screenshotUrl(projectSlug, screenshot, index)}
							/>
						</a>
					))}
				</nav>
			)}
		</section>
	);
}
