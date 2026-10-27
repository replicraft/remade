export function authorProfile(user: string, repositories: string[]) {
	const profiles = repositories.flatMap((repository) => {
		const url = new URL(repository);
		const owner = url.pathname.split("/")[1];
		if (
			owner?.toLowerCase() !== user.toLowerCase() ||
			!["github.com", "codeberg.org"].includes(url.hostname)
		)
			return [];
		return [
			{
				href: `https://${url.hostname}/${owner}`,
				name: url.hostname === "codeberg.org" ? "Codeberg" : "GitHub",
			},
		];
	});
	return (
		profiles.find((profile) => profile.name === "GitHub") ??
		profiles[0] ?? {
			href: `https://github.com/${user}`,
			name: "GitHub",
		}
	);
}
