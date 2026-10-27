import { label } from "../../lib/presentation";
import type { VendorGroup } from "../../lib/vendors";
import PaginatedList from "../navigation/PaginatedList";

type Row = VendorGroup["software"][number];

export default function VendorPage({ group }: { group: VendorGroup }) {
	return (
		<>
			<div className="max-w-3xl pt-12 sm:pt-16">
				<a
					className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-lime"
					href="/vendor/"
				>
					← All vendors
				</a>
				<p className="eyebrow">Original software by vendor</p>
				<h1 data-pagefind-meta="title">{group.vendor.name}</h1>
				<p className="max-w-2xl leading-7">
					Software already in the Remade catalog, its listed reimplementations,
					and what people want built next.
				</p>
				<div className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm">
					<span>
						<strong className="text-ink">{group.software.length}</strong>{" "}
						software listings
					</span>
					<span>
						<strong className="text-lime">{group.projectCount}</strong> projects
					</span>
					<span>
						<strong className="text-ink">{group.requested.length}</strong>{" "}
						requests
					</span>
				</div>
			</div>

			{group.withProjects.length > 0 && (
				<section aria-labelledby="listed-projects">
					<h2 id="listed-projects">
						Software with listed projects{" "}
						<span className="text-muted">{group.withProjects.length}</span>
					</h2>
					<PaginatedList
						className="divide-y divide-line border-y border-line"
						id="vendor-projects"
						label="Software with listed projects"
					>
						{group.withProjects.map((row) => (
							<article
								className="grid gap-4 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8"
								key={row.original.slug}
							>
								<SoftwareTitle row={row} />
								<ul className="grid gap-3">
									{row.projects.map((project) => (
										<li key={project.slug}>
											<div className="flex flex-wrap items-center gap-2">
												<a
													className="font-semibold text-lime hover:underline"
													href={`/projects/${project.slug}/`}
												>
													{project.name} →
												</a>
												<span className="rounded border border-line px-2 py-0.5 text-xs text-muted">
													{label(project.status)}
												</span>
											</div>
											<p className="mb-0 mt-1 text-sm leading-6 text-muted">
												{project.summary}
											</p>
										</li>
									))}
								</ul>
							</article>
						))}
					</PaginatedList>
				</section>
			)}

			{group.requested.length > 0 && (
				<section aria-labelledby="project-requests">
					<h2 id="project-requests">
						Project Requests{" "}
						<span className="text-muted">{group.requested.length}</span>
					</h2>
					<PaginatedList
						className="divide-y divide-line border-y border-line"
						id="vendor-requests"
						label="Project Requests"
					>
						{group.requested.map((row) => (
							<article
								className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8"
								key={row.original.slug}
							>
								<SoftwareTitle row={row} />
								<div>
									<p className="mb-2 text-sm leading-6">
										{row.request?.summary}
									</p>
									<a
										className="text-sm text-lime hover:underline"
										href={`/software/${row.original.slug}/`}
									>
										View request →
									</a>
								</div>
							</article>
						))}
					</PaginatedList>
				</section>
			)}

			{group.unrequested.length > 0 && (
				<section aria-labelledby="other-software">
					<h2 id="other-software">Other cataloged software</h2>
					<p>
						No project or active request is currently listed for these
						originals.
					</p>
					<PaginatedList
						as="ul"
						className="grid gap-4"
						id="vendor-other"
						label="Other software"
					>
						{group.unrequested.map((row) => (
							<li key={row.original.slug}>
								<SoftwareTitle row={row} />
							</li>
						))}
					</PaginatedList>
				</section>
			)}
		</>
	);
}

function SoftwareTitle({ row }: { row: Row }) {
	return (
		<div className="min-w-0">
			<h3 className="mb-1 text-base font-semibold">
				<a className="hover:text-lime" href={`/software/${row.original.slug}/`}>
					{row.original.name}
				</a>
			</h3>
			<p className="mb-0 text-xs text-muted">{label(row.original.category)}</p>
		</div>
	);
}
