import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Screenshot } from "../../lib/schemas";
import { screenshotUrl } from "../../lib/screenshots";

interface Props {
	projectSlug: string;
	projectName: string;
	screenshots?: Screenshot[];
}

export default function ProjectScreenshots({
	projectSlug,
	projectName,
	screenshots,
}: Props) {
	if (!screenshots?.length) return null;

	const multiple = screenshots.length > 1;

	return (
		<section
			aria-label={`${projectName} screenshots`}
			className="my-10 min-w-0"
			data-screenshot-gallery
		>
			<div className="mb-4 flex items-center justify-between gap-4">
				<h2 className="!m-0 text-base font-semibold tracking-normal text-ink">
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
							className="!m-0 min-w-0 basis-full shrink-0 snap-start"
							data-gallery-slide
							id={`${projectSlug}-screenshot-${index + 1}`}
							key={src}
						>
							<a
								aria-label={`Open full-size screenshot: ${screenshot.alt}`}
								className="group relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl bg-black/20"
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

			{multiple && (
				<nav
					aria-label="Choose a screenshot"
					className="mt-3 flex gap-2 overflow-x-auto p-1.5"
				>
					{screenshots.map((screenshot, index) => (
						<a
							aria-current={index === 0 ? "true" : undefined}
							aria-label={`Screenshot ${index + 1}: ${screenshot.alt}`}
							className="block w-24 shrink-0 overflow-hidden rounded-md border-2 border-transparent opacity-55 transition-opacity hover:opacity-100 aria-[current=true]:border-lime aria-[current=true]:opacity-100 motion-reduce:transition-none"
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
