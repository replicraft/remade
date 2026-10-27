import type { Catalog, Vendor } from "./schemas";

export function vendorHref(slug: string): string {
	return `/vendor/${slug}/`;
}

export function normalizeVendorSearch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("en")
		.replace(/[-_\s]+/g, " ")
		.trim();
}

export function vendorGroups(
	catalog: Pick<Catalog, "vendors" | "originals" | "projects" | "requests">,
) {
	return (catalog.vendors ?? [])
		.flatMap((vendor) => {
			const software = catalog.originals
				.filter((original) => original.vendor === vendor.slug)
				.sort((a, b) => a.name.localeCompare(b.name, "en"))
				.map((original) => ({
					original,
					projects: catalog.projects
						.filter((project) => project.originals.includes(original.slug))
						.sort((a, b) => a.name.localeCompare(b.name, "en")),
					request: catalog.requests.find(
						(request) => request.original === original.slug,
					),
				}));
			if (!software.length) return [];
			return [
				{
					vendor,
					software,
					withProjects: software.filter((row) => row.projects.length > 0),
					requested: software.filter(
						(row) => !row.projects.length && row.request,
					),
					unrequested: software.filter(
						(row) => !row.projects.length && !row.request,
					),
					projectCount: new Set(
						software.flatMap((row) =>
							row.projects.map((project) => project.slug),
						),
					).size,
					search: normalizeVendorSearch(
						[
							vendor.slug,
							vendor.name,
							...(vendor.aliases ?? []),
							...software.flatMap((row) => [
								row.original.name,
								...(row.original.aliases ?? []),
							]),
						].join(" "),
					),
				},
			];
		})
		.sort(
			(a, b) =>
				a.vendor.name.localeCompare(b.vendor.name, "en") ||
				a.vendor.slug.localeCompare(b.vendor.slug),
		);
}

export type VendorGroup = ReturnType<typeof vendorGroups>[number];

export function vendorForOriginal(
	vendors: Vendor[],
	vendor?: string,
): Vendor | undefined {
	return vendors.find((record) => record.slug === vendor);
}
