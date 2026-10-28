import { expect, test } from "@playwright/test";

for (const [previous, current, heading] of [
	["/projects/pounce/", "/projects/filecraft/", "FileCraft"],
	["/authors/bherbruck/", "/authors/tangency-labs/", "@tangency-labs"],
]) {
	test(`${previous} redirects to ${current}`, async ({ page }) => {
		await page.goto(previous);

		await expect(page).toHaveURL(new RegExp(`${current}$`));
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
	});
}

test("the previous SolveCraft URL redirects to SolidCraft", async ({
	page,
}) => {
	await page.goto("/projects/solvecraft/");

	await expect(page).toHaveURL(/\/projects\/solidcraft\/$/);
	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"SolidCraft",
	);
});

test("project badge sharing copies the canonical listing and links to badge documentation", async ({
	page,
}) => {
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/projects/solidcraft/");

	const canonical = await page
		.locator('link[rel="canonical"]')
		.getAttribute("href");

	await page
		.getByRole("button", { name: "Copy Markdown", exact: true })
		.click();

	await expect(page.getByRole("status")).toHaveText("Copied!");

	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		`[![Listed on Remade](https://remade.wiki/badges/listed-on-remade.svg)](${canonical})`,
	);

	await page.getByRole("link", { name: "About Remade badges" }).last().click();

	await expect(page).toHaveURL(/\/about\/badges\/$/);

	await expect(page.getByRole("heading", { level: 1 })).toHaveText(
		"Remade Badges",
	);
});

test("home navigation opens the implementation directory", async ({ page }) => {
	await page.goto("/");

	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		/Everything can\s*be remade/,
	);

	await page
		.getByRole("navigation")
		.getByRole("link", { name: "Explore", exact: true })
		.click();

	await expect(page).toHaveURL(/\/explore\/$/);

	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Explore projects",
	);
});

test("JavaScript filters still find tools whose badges only show TypeScript", async ({
	page,
}) => {
	await page.goto("/explore/?q=lazymaplayers&language=JavaScript");

	await expect(
		page.getByRole("combobox", { name: "Language", exact: true }),
	).toHaveValue("JavaScript");

	const card = page.getByRole("article").filter({
		has: page.getByRole("heading", {
			name: "LazyMapLayers for EffectCraft",
		}),
	});

	await expect(card).toBeVisible();

	await expect(card.getByText("TypeScript", { exact: true })).toBeVisible();

	await expect(card.getByText("JavaScript", { exact: true })).toHaveCount(0);

	await card.getByRole("link", { name: "EffectCraft", exact: true }).click();

	await expect(page).toHaveURL(/\/projects\/effectcraft\/$/);
});

test("Explore finds requests when the implementation search is empty", async ({
	page,
}) => {
	await page.goto("/explore/?q=Nomad%20Sculpt");

	await expect(
		page.getByRole("heading", { name: "No matching project is listed yet." }),
	).toBeVisible();

	await expect(
		page.getByRole("link", { name: /Nomad Sculpt/ }).first(),
	).toBeVisible();
});

test("request search points visitors to existing implementations", async ({
	page,
}) => {
	await page.goto("/requests/?q=Outlook");

	await expect(
		page.getByRole("heading", { name: "Related projects" }),
	).toBeVisible();

	await page.locator('a[href="/projects/mailcraft/"]').first().click();

	await expect(page).toHaveURL(/\/projects\/mailcraft\/$/);
});

test("software comparisons open without client-side JavaScript", async ({
	browser,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });

	try {
		const page = await context.newPage();

		await page.goto("http://127.0.0.1:4377/software/adobe-animate/");

		await page.getByText("Compare", { exact: true }).click();

		const table = page.getByRole("table", {
			name: "Compare implementations of Adobe Animate",
		});

		await expect(table).toBeVisible();

		await expect(table.getByRole("link", { name: /Flare/ })).toBeVisible();

		await expect(table.getByRole("link", { name: /Next2D/ })).toBeVisible();
	} finally {
		await context.close();
	}
});

test("static catalog exports and discovery files are served by the production build", async ({
	request,
}) => {
	const catalogResponse = await request.get("/data/catalog.json");

	expect(catalogResponse.ok()).toBe(true);

	const catalog = await catalogResponse.json();

	expect(catalog.schemaVersion).toBe(2);

	expect(catalog.projects.length).toBeGreaterThan(0);

	expect(
		catalog.projects.every(
			(project: { originals?: string[] }) => project.originals?.length,
		),
	).toBe(true);

	const requestsResponse = await request.get("/data/requests.json");

	expect(requestsResponse.ok()).toBe(true);

	const requests = await requestsResponse.json();

	expect(requests.schemaVersion).toBe(2);

	expect(requests.requests.length).toBeGreaterThan(0);

	for (const entry of [...catalog.projects, ...requests.requests]) {
		expect(entry).not.toHaveProperty("discord_server");
		expect(entry).not.toHaveProperty("discord_thread");
		expect(entry.summary).toEqual(expect.any(String));
	}

	expect(await (await request.get("/robots.txt")).text()).toContain(
		"Sitemap: https://remade.wiki/sitemap-index.xml",
	);

	expect((await request.get("/sitemap-index.xml")).ok()).toBe(true);
});

test("anonymous browsing offers sign-in without contacting the authentication API", async ({
	page,
}) => {
	const authRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/api/v1/auth/"))
			authRequests.push(request.url());
	});
	await page.goto("/");
	const login = page.getByRole("button", { name: "Login", exact: true });
	await expect(login).toBeVisible();
	await page.getByRole("link", { name: "Explore", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Login", exact: true }),
	).toBeVisible();
	await page.getByRole("button", { name: "Login", exact: true }).click();
	await expect(
		page.getByRole("link", { name: "Continue with GitHub" }),
	).toHaveAttribute("href", /\/auth\/github$/);
	await expect(
		page.getByRole("link", { name: "Continue with Discord" }),
	).toHaveAttribute("href", /\/auth\/discord$/);
	expect(authRequests).toEqual([]);
});

test("mobile login dropdown fits the viewport and retains its provider preference", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto("/");
	const menuBounds = await page
		.getByLabel("Menu", { exact: true })
		.boundingBox();
	const loginBounds = await page
		.getByRole("button", { name: "Login", exact: true })
		.boundingBox();
	expect(menuBounds).not.toBeNull();
	expect(loginBounds).not.toBeNull();
	expect((menuBounds?.x || 0) + (menuBounds?.width || 0)).toBeLessThanOrEqual(
		loginBounds?.x || 0,
	);
	await page.evaluate(() =>
		localStorage.setItem("remade-last-login-provider", "github"),
	);
	await page.reload();
	await page.getByRole("button", { name: "Login", exact: true }).click();
	const provider = page.getByRole("link", {
		name: "Continue with GitHub Last used",
	});
	await expect(provider).toBeVisible();
	const bounds = await provider.boundingBox();
	expect(bounds?.x).toBeGreaterThanOrEqual(0);
	expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(320);
	await page.keyboard.press("Escape");
	await expect(provider).not.toBeVisible();
});

test("invalid returning sessions clear the login hint", async ({
	page,
	context,
}) => {
	await context.addCookies([
		{ name: "remade_login_hint", value: "1", url: "http://127.0.0.1:4377" },
	]);
	await page.route("**/api/v1/auth/me", async (route) => {
		await route.fulfill({
			status: 401,
			body: "Unauthorized",
			headers: {
				"Access-Control-Allow-Origin": "http://127.0.0.1:4377",
				"Access-Control-Allow-Credentials": "true",
			},
		});
	});
	const response = page.waitForResponse("**/api/v1/auth/me");
	await page.goto("/");
	await response;
	await expect
		.poll(async () =>
			(await context.cookies()).some(
				(cookie) => cookie.name === "remade_login_hint",
			),
		)
		.toBe(false);
	await expect(
		page.getByRole("button", { name: "Login", exact: true }),
	).toBeVisible();
});

test("a returning account can log out from the mobile header", async ({
	page,
	context,
}) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await context.addCookies([
		{ name: "remade_login_hint", value: "1", url: "http://127.0.0.1:4377" },
	]);
	let lookups = 0;
	const cors = {
		"Access-Control-Allow-Origin": "http://127.0.0.1:4377",
		"Access-Control-Allow-Credentials": "true",
	};
	await page.route("**/api/v1/auth/me", async (route) => {
		lookups++;
		await route.fulfill({
			status: 200,
			headers: cors,
			json: {
				id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
				displayName: "Example User",
				avatarUrl: null,
				identities: [{ provider: "github", username: "example" }],
			},
		});
	});
	await page.route("**/api/v1/auth/logout", async (route) => {
		expect(route.request().method()).toBe("POST");
		await route.fulfill({ status: 204, headers: cors });
	});
	await page.goto("/");
	await page
		.getByRole("combobox", { name: "Account menu for Example User" })
		.click();
	await expect(page.getByText("Example User", { exact: true })).toBeVisible();
	const logout = page.getByRole("option", { name: "Logout", exact: true });
	const bounds = await logout.boundingBox();
	expect(bounds?.x).toBeGreaterThanOrEqual(0);
	expect((bounds?.x || 0) + (bounds?.width || 0)).toBeLessThanOrEqual(320);
	await logout.click();
	await expect(
		page.getByRole("button", { name: "Login", exact: true }),
	).toBeVisible();
	expect(lookups).toBe(1);
	expect(
		(await context.cookies()).some(
			(cookie) => cookie.name === "remade_login_hint",
		),
	).toBe(false);
});

test("approved legal pages and footer links work without JavaScript", async ({
	browser,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:4377/");
		const footer = page.getByRole("navigation", {
			name: "Footer",
			exact: true,
		});
		await expect(
			footer.getByRole("link", { name: "Terms", exact: true }),
		).toHaveAttribute("href", "/terms/");
		await expect(
			footer.getByRole("link", { name: "Privacy", exact: true }),
		).toHaveAttribute("href", "/privacy/");
		await expect(footer).not.toContainText("admin@remade.wiki");
		for (const [path, title] of [
			["/terms/", "Terms of Service"],
			["/privacy/", "Privacy Policy"],
		]) {
			const response = await page.goto(`http://127.0.0.1:4377${path}`);
			expect(response?.status()).toBe(200);
			await expect(
				page.getByRole("heading", { level: 1, name: title, exact: true }),
			).toBeVisible();
			await expect(page.locator("body")).not.toContainText("Draft preview");
			await expect(page.locator("body")).not.toContainText(
				"[[OPERATOR_LEGAL_NAME]]",
			);
			await expect(
				page.locator('meta[name="robots"][content*="noindex"]'),
			).toHaveCount(0);
			await page
				.getByRole("article")
				.getByRole("link", { name: /contact/i })
				.first()
				.click();
			await expect(page).toHaveURL(/\/disclaimer\/#contact$/);
		}
		const preview = await page.goto("http://127.0.0.1:4377/legal-preview/");
		expect(preview?.status()).toBe(404);
	} finally {
		await context.close();
	}
});

test("adjacent page links work across project and request directories", async ({
	page,
}) => {
	for (const base of ["/explore/", "/requests/"]) {
		await page.goto(base);
		const pagination = page.getByRole("navigation", {
			name: "Pagination",
			exact: true,
		});
		await expect(
			pagination.getByRole("link", { name: "← Prev" }),
		).toHaveAttribute("aria-disabled", "true");
		await pagination.getByRole("link", { name: "Next →" }).click();
		await expect(page).toHaveURL(new RegExp(`${base}page/2/$`));
		await pagination.getByRole("link", { name: "← Prev" }).click();
		await expect(page).toHaveURL(new RegExp(`${base}$`));
	}
});

test("vendor pagination supports deep links, history, filtering and mobile layout", async ({
	page,
}) => {
	await page.setViewportSize({ width: 320, height: 800 });
	await page.goto("/vendor/");
	const items = page.locator("[data-vendor-search]:visible");
	const pagination = page.getByRole("navigation", {
		name: "Vendors pagination",
	});
	await expect(items).toHaveCount(24);
	const first = await items.first().textContent();
	await pagination.getByRole("link", { name: "Next →" }).click();
	await expect(page).toHaveURL(/vendors-page=2/);
	await expect(items).toHaveCount(24);
	expect(await items.first().textContent()).not.toBe(first);
	await page.reload();
	await expect(
		pagination.getByRole("link", { name: "2", exact: true }),
	).toHaveAttribute("aria-current", "page");
	await page.goBack();
	await expect(items.first()).toHaveText(first ?? "");
	await pagination.getByRole("link", { name: "Next →" }).click();
	await page
		.getByRole("searchbox", { name: "Find a vendor or software" })
		.fill("Autodesk");
	await expect(items).toHaveCount(1);
	await expect(pagination).not.toBeVisible();
	await expect(page).not.toHaveURL(/vendors-page=/);
	await page.getByRole("searchbox").fill("");
	await expect(items).toHaveCount(24);
	await expect(pagination).toBeVisible();
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});

test("pagination ellipses jump to a typed page in both static and enhanced lists", async ({
	page,
}) => {
	for (const path of ["/requests/", "/vendor/"]) {
		await page.goto(path);
		const pagination = page.locator("[data-pagination-nav]:visible").first();
		const jump = pagination.locator('[data-pagination-gap="gap-end"]');
		await jump.locator("summary").click();
		const input = jump.getByRole("spinbutton", { name: "Page number" });
		await expect(input).toBeFocused();
		const maximum = Number(await input.getAttribute("max"));
		await input.fill(String(maximum + 1));
		await jump.getByRole("button", { name: "Go", exact: true }).click();
		await expect(page).not.toHaveURL(/page\/\d|vendors-page=/);
		await input.fill(String(maximum));
		await input.press("Enter");
		await expect(
			pagination.getByRole("link", { name: String(maximum), exact: true }),
		).toHaveAttribute("aria-current", "page");
		await expect(
			pagination.getByRole("link", { name: "Next →" }),
		).toHaveAttribute("aria-disabled", "true");
		const earlier = pagination.locator('[data-pagination-gap="gap-start"]');
		await earlier.locator("summary").click();
		await earlier.getByRole("spinbutton").press("Escape");
		await expect(earlier).not.toHaveAttribute("open", "");
		await expect(earlier.locator("summary")).toBeFocused();
	}
});

test("vendor lists remain complete without JavaScript", async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:4377/vendor/");
		expect(
			await page.locator("[data-vendor-search]:visible").count(),
		).toBeGreaterThan(24);
		await expect(
			page.getByRole("navigation", { name: "Vendors pagination" }),
		).not.toBeVisible();
	} finally {
		await context.close();
	}
});

test("request pagination works without JavaScript and uses distinct canonical URLs", async ({
	browser,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:4377/requests/");
		const first = await page
			.locator("#directory-results article h3")
			.first()
			.textContent();
		await expect(page.locator("#directory-results article")).toHaveCount(24);
		await page
			.getByRole("navigation", { name: "Pagination" })
			.getByRole("link", { name: "2", exact: true })
			.click();
		await expect(page).toHaveURL(/\/requests\/page\/2\/$/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			"href",
			"https://remade.wiki/requests/page/2/",
		);
		await expect(page.locator("#directory-results article")).toHaveCount(24);
		expect(
			await page.locator("#directory-results article h3").first().textContent(),
		).not.toBe(first);
	} finally {
		await context.close();
	}
});

test("production request intake offers the real GitHub fallback and excludes local simulations", async ({
	page,
}) => {
	await page.goto("/requests/new/");
	await expect(
		page.getByRole("link", { name: "Open the GitHub request form" }),
	).toHaveAttribute("href", /template=project-request.yml/);
	await expect(
		page.getByText("Local preview controls", { exact: true }),
	).toHaveCount(0);
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		"content",
		"noindex, follow",
	);
});

test("project screenshots support thumbnails and keyboard navigation without changing page focus", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/projects/mixstudio/");
	const gallery = page.getByRole("region", {
		name: "MixStudio screenshots",
		exact: true,
	});
	const track = gallery.getByRole("region", { name: "Scrollable screenshots" });

	await expect(gallery.locator("[data-gallery-count]")).toHaveText("1 / 3");
	await expect(
		gallery.getByRole("button", { name: "Previous screenshot" }),
	).toBeDisabled();
	await gallery.getByRole("button", { name: "Next screenshot" }).click();
	await expect(gallery.locator("[data-gallery-count]")).toHaveText("2 / 3");

	await gallery.getByRole("link", { name: /^Screenshot 3:/ }).click();
	await expect(gallery.locator("[data-gallery-count]")).toHaveText("3 / 3");
	await expect(
		gallery.getByRole("button", { name: "Next screenshot" }),
	).toBeDisabled();

	await track.focus();
	await page.keyboard.press("Home");
	await expect(gallery.locator("[data-gallery-count]")).toHaveText("1 / 3");
	await expect(track).toBeFocused();
});

test("screenshots remain browsable with JavaScript disabled", async ({
	browser,
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	const page = await context.newPage();

	try {
		await page.goto("/projects/mixstudio/");
		const gallery = page.getByRole("region", {
			name: "MixStudio screenshots",
			exact: true,
		});

		await expect(
			gallery.getByRole("link", { name: /^Open full-size screenshot:/ }),
		).toHaveCount(3);
		await expect(
			gallery.getByRole("button", { name: "Next screenshot" }),
		).not.toBeVisible();
		await gallery.getByRole("link", { name: /^Screenshot 3:/ }).click();
		const position = await gallery
			.locator("[data-gallery-track]")
			.evaluate((element) => element.scrollLeft);
		expect(position).toBeGreaterThan(0);
	} finally {
		await context.close();
	}
});

test("project browser links appear beside Website only when configured", async ({
	page,
}) => {
	await page.goto("/projects/solidcraft/");
	const website = page.getByRole("link", { name: "Website ↗", exact: true });
	const browserApp = page.getByRole("link", {
		name: "Try it in your browser ↗",
		exact: true,
	});
	await expect(browserApp).toHaveAttribute("href", "https://solidcraft.io/app");
	await expect(browserApp).toHaveAttribute("rel", "noopener noreferrer");
	expect(
		await website.evaluate((link) =>
			link.nextElementSibling?.textContent?.trim(),
		),
	).toBe("Try it in your browser ↗");
	await page.goto("/projects/notecraft/");
	await expect(
		page.getByRole("link", { name: "Try it in your browser ↗", exact: true }),
	).toHaveCount(0);
});

test("account settings starts connecting another provider with an empty POST", async ({
	page,
	context,
}) => {
	await context.addCookies([
		{ name: "remade_login_hint", value: "1", url: "http://127.0.0.1:4377" },
	]);
	await page.route("**/api/v1/auth/me", async (route) => {
		await route.fulfill({
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "http://127.0.0.1:4377",
				"Access-Control-Allow-Credentials": "true",
			},
			json: {
				id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
				displayName: "Example User",
				avatarUrl: null,
				identities: [{ provider: "github", username: "example" }],
			},
		});
	});
	await page.route("**/api/v1/auth/discord/link", async (route) => {
		expect(route.request().method()).toBe("POST");
		expect(route.request().postData() || "").toBe("");
		expect(route.request().headers().origin).toBe("http://127.0.0.1:4377");
		await route.fulfill({
			status: 200,
			contentType: "text/plain",
			body: "OAuth connection started",
		});
	});
	await page.goto("/");
	await page
		.getByRole("combobox", { name: "Account menu for Example User" })
		.click();
	await page
		.getByRole("option", { name: "Account settings", exact: true })
		.click();
	await expect(page).toHaveURL(/\/account\/$/);
	await expect(page.getByText("Connected as @example")).toBeVisible();
	const request = page.waitForRequest("**/api/v1/auth/discord/link");
	await page.getByRole("button", { name: "Connect Discord" }).click();
	await request;
	await expect(page.getByText("OAuth connection started")).toBeVisible();
});

test("duplicate-email sign-in shows guidance without reflecting arbitrary messages", async ({
	page,
}) => {
	await page.goto("/login/?auth_error=email_in_use");
	await expect(page.getByRole("status")).toContainText(
		"Sign in with your existing method",
	);
	await page.goto("/login/?auth_error=untrusted-message");
	await expect(page.getByText("untrusted-message")).toHaveCount(0);
});

test("vendor pages show implemented originals as well as outstanding requests", async ({
	page,
}) => {
	await page.goto("/vendor/autodesk/");
	await expect(
		page.getByRole("heading", { name: "Autodesk", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Autodesk Fusion", exact: true }),
	).toHaveAttribute("href", "/software/autodesk-fusion/");
	await expect(
		page.getByRole("link", { name: "SolidCraft →", exact: true }).first(),
	).toHaveAttribute("href", "/projects/solidcraft/");
	await expect(
		page.getByRole("heading", { name: /Project Requests/ }),
	).toBeVisible();
	await page.goto("/software/autodesk-fusion/");
	await expect(
		page.getByRole("link", { name: "Autodesk", exact: true }),
	).toHaveAttribute("href", "/vendor/autodesk/");
});

test("vendor index searches names and cataloged software locally", async ({
	page,
}) => {
	await page.goto("/vendor/");
	await page
		.getByRole("searchbox", { name: "Find a vendor or software" })
		.fill("Photoshop");
	await expect(page.getByRole("status")).toHaveText("1 vendor");
	await expect(
		page.locator("li[data-vendor-search]:visible a"),
	).toHaveAttribute("href", "/vendor/adobe/");
	await page.getByRole("searchbox").fill("no-vendor-matches-this");
	await expect(page.getByText("No vendors match your search.")).toBeVisible();
});

test("vendor browsing works without JavaScript", async ({ browser }) => {
	const context = await browser.newContext({ javaScriptEnabled: false });
	try {
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:4377/vendor/");
		await page.locator('main a[href="/vendor/autodesk/"]').click();
		await expect(
			page.getByRole("heading", { name: "Autodesk", exact: true }),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Autodesk Fusion", exact: true }),
		).toBeVisible();
	} finally {
		await context.close();
	}
});

test("exact vendor searches offer a shortcut from home and both directories", async ({
	page,
}) => {
	await page.goto("/");
	await page.getByRole("searchbox").fill(" Autodesk ");
	await expect(
		page.getByRole("link", { name: "See all by Autodesk →", exact: true }),
	).toHaveAttribute("href", "/vendor/autodesk/");
	await page.getByRole("searchbox").fill("Autodes");
	await expect(
		page.getByRole("link", { name: /See all by Autodesk/ }),
	).toHaveCount(0);
	for (const path of [
		"/explore/?q=autodesk",
		"/requests/?q=AUTODESK",
		"/explore/page/2/?q=autodesk",
		"/requests/page/2/?q=autodesk",
	]) {
		await page.goto(path);
		await expect(
			page.getByRole("link", { name: "See all by Autodesk →", exact: true }),
		).toHaveAttribute("href", "/vendor/autodesk/");
	}
	await page.goto("/explore/?q=Alludo");
	await expect(
		page.getByRole("link", { name: "See all by Corel →", exact: true }),
	).toHaveAttribute("href", "/vendor/corel/");
});

test("tool target hover lists include every project and dismiss with Escape", async ({
	page,
}) => {
	await page.goto("/explore/?q=OpenPlayground");
	const card = page.getByRole("article").filter({
		has: page.getByRole("heading", { name: "OpenPlayground", exact: true }),
	});
	const list = card.locator("[data-tool-targets]");
	const trigger = list.locator("summary");
	await expect(list).not.toHaveAttribute("open", "");
	await trigger.hover();
	await expect(list).toHaveAttribute("open", "");
	await expect(list.getByRole("link")).toHaveCount(32);
	await expect(
		list.getByRole("link", { name: "PhotoCraft", exact: true }),
	).toHaveAttribute("href", "/projects/photocraft/");
	await expect(
		list.getByRole("link", { name: "MailCraft", exact: true }),
	).toHaveAttribute("href", "/projects/ucs-mailcraft/");
	await page.keyboard.press("Escape");
	await expect(list).not.toHaveAttribute("open", "");
	await page.mouse.move(0, 0);
	await trigger.focus();
	await page.keyboard.press("Shift+Tab");
	await page.keyboard.press("Tab");
	await expect(list).toHaveAttribute("open", "");
	await page.keyboard.press("Tab");
	await expect(list.getByRole("link").first()).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(trigger).toBeFocused();
	await expect(list).not.toHaveAttribute("open", "");
});

test("tool target lists open by tap on mobile", async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		baseURL,
		viewport: { width: 320, height: 760 },
		hasTouch: true,
		isMobile: true,
	});
	try {
		const page = await context.newPage();
		await page.goto("/explore/?q=OpenPlayground");
		const list = page
			.getByRole("article")
			.filter({
				has: page.getByRole("heading", { name: "OpenPlayground", exact: true }),
			})
			.locator("[data-tool-targets]");
		await list.locator("summary").tap();
		await expect(list.getByRole("link").first()).toBeVisible();
		await list.getByRole("link", { name: "EarthCraft", exact: true }).click();
		await expect(page).toHaveURL(/\/projects\/earthcraft\/$/);
	} finally {
		await context.close();
	}
});

test("signing out in the header clears the separate account settings island", async ({
	page,
	context,
}) => {
	await context.addCookies([
		{ name: "remade_login_hint", value: "1", url: "http://127.0.0.1:4377" },
	]);
	await page.route("**/api/v1/auth/me", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "http://127.0.0.1:4377",
				"Access-Control-Allow-Credentials": "true",
			},
			json: {
				id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
				displayName: "Example User",
				avatarUrl: null,
				identities: [{ provider: "github", username: "example" }],
			},
		}),
	);
	await page.route("**/api/v1/auth/logout", (route) =>
		route.fulfill({
			status: 204,
			headers: {
				"Access-Control-Allow-Origin": "http://127.0.0.1:4377",
				"Access-Control-Allow-Credentials": "true",
			},
		}),
	);
	await page.goto("/account/");
	await expect(page.getByText("Connected as @example")).toBeVisible();
	await page
		.getByRole("combobox", { name: "Account menu for Example User" })
		.click();
	await page.getByRole("option", { name: "Logout", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Login", exact: true }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Sign in to manage your account" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Connect Discord" }),
	).toHaveCount(0);
	await expect(page.getByText("Connected as @example")).toHaveCount(0);
});

test("a rejected provider attempt preserves Last used and does not announce an older session", async ({
	page,
	context,
}) => {
	await context.addCookies([
		{ name: "remade_login_hint", value: "1", url: "http://127.0.0.1:4377" },
	]);
	await page.addInitScript(() => {
		sessionStorage.setItem("remade-pending-login-toast", String(Date.now()));
		sessionStorage.setItem("remade-pending-login-provider", "discord");
		localStorage.setItem("remade-last-login-provider", "github");
	});
	await page.route("**/api/v1/auth/me", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "http://127.0.0.1:4377",
				"Access-Control-Allow-Credentials": "true",
			},
			json: {
				id: "0199c128-5d8f-7a26-b1e8-40c906f33871",
				displayName: "Existing User",
				avatarUrl: null,
				identities: [
					{ provider: "github", username: "old-gh" },
					{ provider: "discord", username: "old-discord" },
				],
			},
		}),
	);
	await page.goto("/login/?auth_error=email_in_use&provider=discord");
	await expect(
		page.getByRole("combobox", { name: "Account menu for Existing User" }),
	).toBeVisible();
	await expect(page.getByRole("status")).toContainText("already registered");
	await expect
		.poll(() =>
			page.evaluate(() => sessionStorage.getItem("remade-pending-login-toast")),
		)
		.toBeNull();
	expect(
		await page.evaluate(() =>
			localStorage.getItem("remade-last-login-provider"),
		),
	).toBe("github");
	await expect(
		page.getByText("Logged in as old-discord", { exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByText("Logged in as old-gh", { exact: true }),
	).toHaveCount(0);
});
