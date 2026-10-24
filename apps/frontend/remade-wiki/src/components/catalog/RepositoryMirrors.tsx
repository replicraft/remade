import { contributeUrl } from "../../lib/presentation";

export default function RepositoryMirrors({ mirrors }: { mirrors?: string[] }) {
	return (
		<div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
			<h2 className="mb-3 text-lg">Repository Mirrors</h2>

			{mirrors?.length ? (
				<details>
					<summary className="w-fit cursor-pointer text-sm text-lime hover:underline">
						<span className="ml-1">View Mirrors</span>
					</summary>

					<div className="mt-3">
						<ul className="m-0 grid list-none gap-3 p-0">
							{mirrors.map((mirror) => (
								<li key={mirror}>
									<a
										className="break-all text-sm text-lime hover:underline"
										href={mirror}
										rel="noopener noreferrer"
										target="_blank"
									>
										{new URL(mirror).host + new URL(mirror).pathname} ↗
									</a>
								</li>
							))}
						</ul>
					</div>
				</details>
			) : (
				<p className="mb-0 text-sm leading-6 text-muted">
					No mirrors found.{" "}
					<a
						className="text-lime hover:underline"
						href={contributeUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						Contribute a mirror link ↗
					</a>
				</p>
			)}
		</div>
	);
}
