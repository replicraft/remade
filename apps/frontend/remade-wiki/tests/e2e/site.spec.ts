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

	await page
		.getByRole("link", { name: "MailCraft", exact: true })
		.first()
		.click();

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

		await expect(
			table.getByRole("link", { name: /AnimationCraft/ }),
		).toBeVisible();
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

	expect(catalog.schemaVersion).toBe(1);

	expect(catalog.projects.length).toBeGreaterThan(0);

	expect(
		catalog.projects.every(
			(project: { originals?: string[] }) => project.originals?.length,
		),
	).toBe(true);

	const requestsResponse = await request.get("/data/requests.json");

	expect(requestsResponse.ok()).toBe(true);

	expect((await requestsResponse.json()).requests.length).toBeGreaterThan(0);

	expect(await (await request.get("/robots.txt")).text()).toContain(
		"Sitemap: https://remade.wiki/sitemap-index.xml",
	);

	expect((await request.get("/sitemap-index.xml")).ok()).toBe(true);
});

test("anonymous browsing keeps account access reachable without an authentication lookup", async ({
	page,
}) => {
	const authRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/api/v1/auth/"))
			authRequests.push(request.url());
	});
	await page.goto("/");
	const login = page.getByRole("link", { name: "Login", exact: true });
	await expect(login).toHaveCount(1);
	await page.getByRole("link", { name: "Explore", exact: true }).click();
	await expect(
		page.getByRole("link", { name: "Login", exact: true }),
	).toHaveCount(0);
	expect(authRequests).toEqual([]);
});

// Restore production account flows when authentication is enabled in the header.
test.fixme("invalid returning sessions clear the login hint", async ({
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
		page.getByRole("link", { name: "Login", exact: true }),
	).toBeVisible();
});

test.fixme("a returning account can log out from the mobile header", async ({
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
		page.getByRole("link", { name: "Login", exact: true }),
	).toBeVisible();
	expect(lookups).toBe(1);
	expect(
		(await context.cookies()).some(
			(cookie) => cookie.name === "remade_login_hint",
		),
	).toBe(false);
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
