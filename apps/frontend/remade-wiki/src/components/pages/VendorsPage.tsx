import { type VendorGroup, vendorHref } from "../../lib/vendors";
import PaginatedList from "../navigation/PaginatedList";

export default function VendorsPage({ groups }: { groups: VendorGroup[] }) {
	return (
		<>
			<div className="max-w-3xl pt-12 sm:pt-16">
				<p className="eyebrow">Browse the catalog</p>
				<h1 data-pagefind-meta="title">Software by vendor</h1>
				<p>
					Find a vendor’s software, its listed projects, and outstanding
					requests. Only software already in the catalog appears here.
				</p>
			</div>
			<section aria-label="Vendors" className="!mt-8" data-vendor-directory>
				<div className="mb-7 max-w-xl" data-vendor-search-controls hidden>
					<label className="font-semibold" htmlFor="vendor-search">
						Find a vendor or software
					</label>
					<input
						className="mt-2 w-full"
						id="vendor-search"
						placeholder="Autodesk, Photoshop, Microsoft…"
						type="search"
					/>
				</div>
				<p
					className="text-sm text-muted"
					data-vendor-result-count
					role="status"
				>
					{groups.length} vendors
				</p>
				<PaginatedList
					as="ul"
					className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3"
					id="vendors-page"
					label="Vendors"
				>
					{groups.map((group) => (
						<li data-vendor-search={group.search} key={group.vendor.slug}>
							<a
								className="block rounded-lg px-3 py-4 hover:bg-surface focus-visible:outline-2 focus-visible:outline-lime"
								href={vendorHref(group.vendor.slug)}
							>
								<span className="font-semibold text-ink">
									{group.vendor.name}{" "}
									<span aria-hidden="true" className="text-lime">
										→
									</span>
								</span>
								<span className="mt-1 block text-xs leading-5 text-muted">
									{group.software.length} software · {group.withProjects.length}{" "}
									with projects · {group.requested.length} requests
								</span>
							</a>
						</li>
					))}
				</PaginatedList>
				<p className="mt-5" data-vendor-no-results hidden>
					No vendors match your search.
				</p>
			</section>
		</>
	);
}
