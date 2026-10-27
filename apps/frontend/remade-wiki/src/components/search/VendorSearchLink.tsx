import type { Vendor } from "../../lib/schemas";
import { vendorHref } from "../../lib/vendors";

export default function VendorSearchLink({ vendor }: { vendor?: Vendor }) {
	if (!vendor) return null;
	return (
		<a
			className="inline-block text-sm text-lime hover:underline"
			href={vendorHref(vendor.slug)}
		>
			See all by {vendor.name} →
		</a>
	);
}
