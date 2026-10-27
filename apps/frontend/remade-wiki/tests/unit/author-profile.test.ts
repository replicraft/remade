import { expect, it } from "vitest";
import { authorProfile } from "../../src/lib/author-profile";

it("links a repository owner to the hosting provider's profile", () => {
	expect(
		authorProfile("etchedpixels", ["https://codeberg.org/EtchedPixels/FUZIX"]),
	).toEqual({ href: "https://codeberg.org/EtchedPixels", name: "Codeberg" });
	expect(
		authorProfile("automattic", ["https://github.com/Automattic/harper"]),
	).toEqual({ href: "https://github.com/Automattic", name: "GitHub" });
});

it("keeps the GitHub fallback for explicitly credited authors who are not owners", () => {
	expect(
		authorProfile("ahmedarif193", ["https://github.com/LiberNT/LiberNT"]),
	).toEqual({ href: "https://github.com/ahmedarif193", name: "GitHub" });
	expect(authorProfile("alice", ["https://example.org/alice/repo"])).toEqual({
		href: "https://github.com/alice",
		name: "GitHub",
	});
});

it("prefers a matching GitHub profile when both providers are represented", () => {
	expect(
		authorProfile("alice", [
			"https://codeberg.org/alice/repo",
			"https://github.com/alice/other",
		]).name,
	).toBe("GitHub");
});
