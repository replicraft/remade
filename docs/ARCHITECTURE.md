# Architecture

## Principles

1. Entire user-facing site generated as static Astro HTML/assets.
2. Git repo is the only canonical catalog datastore. The separate authentication Worker stores accounts and sessions only; catalog browsing stays static.
3. No user-provided code is executed during validation, indexing, or compilation.
4. No GitHub metadata API calls from visitors; metadata is a **cached build input**. Explicit login uses server-side GitHub OAuth through the separate Worker.
5. Failure to refresh metadata must never delete a valid listing.
6. Editorial curation and accepted contributions are reproducible in Git history.

## Workspace layout

The Astro app, public assets and frontend tests live in `apps/frontend/remade-wiki/`. The Rust authentication Worker lives in `apps/backend/remade-api/`. The root pnpm package delegates frontend commands to that workspace and owns shared Biome/Lefthook and Wrangler/Vitest tooling. Python stays in `scripts/`, documentation and workflows stay at the root, and the metadata cache remains `cache/github-metadata.json`. Catalog addition dates and targeted metadata refreshes read both current and pre-migration Git paths.

Frontend components live under `apps/frontend/remade-wiki/src/components/`, grouped by purpose: `auth/` for account controls, `badges/` for sharing, `catalog/` for cards and project metadata, `navigation/` for the header and footer, `search/` for discovery controls and results, and `pages/` for page content including Explore. Import components directly from these folders; Astro routes remain in `src/pages/` and the document layout remains in `src/layouts/`. Shared interactive auth and Explore state use Zustand stores in `src/stores/`, scoped to their React providers, rather than module-global user or filter state. Keep stores and hooks in plain `.ts` modules and React providers in their component folders so Fast Refresh sees component-only exports. Components subscribe with selectors; account state actions live in `src/stores/`, while API helpers, login notification helpers and catalog search projections live in `src/lib/`. Keep transient UI state such as dropdown visibility local to its component.

## Data pipeline

Authentication lives separately in `apps/backend/remade-api/` at `api.remade.wiki`, with D1 for provider-independent UUIDv7 accounts, hashed opaque sessions and separate request upvote/builder records. Request counters are runtime enhancements and never become catalog source data; see `PROJECT_REQUESTS.md`. The header's small React island fetches a session only when a non-secret returning-user hint exists. Anonymous browsing never invokes the Worker. See [Authentication](AUTH.md) for local development, security boundaries and manual production setup. It does not change catalog publishing or public JSON exports.

```text
Contributor PR (apps/frontend/remade-wiki/src/content/catalog/projects/<github-user>/<slug>.yaml OR apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml)
    ↓  read-only validation + Lychee + policy acknowledgment
Maintainer reviews → merges
    ↓
Git-tracked project YAML + original records + featured selections
    ├── catalog validator (schema, unique ids, URLs, references, unfulfilled requests)
    ├── cached cache/github-metadata.json (stars/forks/etc.)
    └── Astro static build
           ├── /                       Featured, recently added
           ├── /explore                filters/sort + search
           ├── /software/[slug]        one original → many projects
           ├── /projects/[slug]        individual project
           ├── /suites/[slug]          suite member cards and supporting tools
           ├── /authors/[github-user] attributed indexed projects and tools
           ├── /requests              unfulfilled community requests
           ├── /about                 story, mission and community
           ├── /data/catalog.json     public machine-readable catalog
           ├── /data/requests.json    public machine-readable requests
           ├── /disclaimer            approved text
           └── Pagefind index         no hosted search service

Trusted scheduled metadata job (roughly every 24h)
    ↓
GitHub GraphQL: batched repository aliases
    ↓
Update cache snapshot → next static build consumes it
```

Suite YAML is validated alongside projects and tools. The loader expands suite references into each tool’s resolved `projects` for category inheritance and backlinks while retaining `suites` for compact linked labels. Static suite pages and public JSON use the same validated membership; suites do not create repository statistics or request fulfillment.

## GitHub statistics and rate limits

The trusted daily metadata job fetches data using a **short-lived organization-owned GitHub App installation token**, normally 5,000 GraphQL points/hour per installation for a non-Enterprise organization. The built-in GitHub Actions `GITHUB_TOKEN` (1,000 points/hour/repository) remains available for normal CI; cache pushes authenticate using the App token. Neither limit is a cap on catalog entries. Batch ~25 repository aliases/query; tune against actual response cost, node, timeout, and secondary rate limits. Some fields on third-party public repositories may be restricted to GitHub App installation tokens; verify the metadata query and fall back to the built-in `GITHUB_TOKEN` for reads if necessary.

**Cache design:** `cache/github-metadata.json` maps a normalized `owner/repo` key to stargazers, forks, primary language, license SPDX, `pushedAt`, `isArchived`, and a `fetchedAt` timestamp per successful record. A failed response leaves previous values intact. New entries whose API fetch fails render gracefully without counts. Never sort absent values as `0` or infer inactivity from API failure.

**Refreshing:** schedule the trusted collector daily. The refresh action pushes the snapshot to `main` using the GitHub App installation token, with Contents: Write and bypass permission for the rules protecting that branch. App-authenticated pushes can trigger downstream push workflows; cache-only commits do not match the metadata workflow’s project/tool path filters. Do not set up a second always-on service.

**Page wording:** “GitHub statistics are refreshed approximately every 24 hours.” A tooltip shows `fetchedAt` for the displayed repository. Do **not** claim the data is live; successful fetches may be older if GitHub was unavailable.

**Do not** request actual stars in the visitor's browser: that would consume shared anonymous limits and make server-rendered sorting unstable.

## Static build stages

Addition dates come from the first Git commit adding each YAML entry, so builds need full Git history. The loader reads all catalog additions in one asynchronous Git history scan and shares the resulting promise across concurrent loads. Dates are cached by HEAD revision; commits invalidate the cache automatically. YAML remains freshly loaded and validated, so local content edits appear without restarting. Current and pre-migration paths, vendor folders and redirected project slugs preserve their earliest addition dates. For Cloudflare's shallow checkout, set the build command in the dashboard to `git fetch --unshallow && pnpm build`. This fetch preserves the checked-out commit. The Pages root directory stays at the repository root, using the shared lockfile and root build command; set its output directory to `apps/frontend/remade-wiki/dist`. Local builds use `pnpm build`; GitHub Actions already checks out full history with `fetch-depth: 0`.

1. Load and validate original records, projects, supporting tools, requests, and `featured.yaml`. Tools are a separate collection joined to existing project slugs; they do not count as implementations or fulfill requests. Featured selections may include tools labeled Tool.
2. Join each project with all canonical targets in its required `originals` array by slug. Index it once; software pages, search, related projects and request fulfillment consider all targets. Repository statistics remain keyed to the single project repository.
   Read explicit project/tool `authors` GitHub handles directly from entry YAML; group all indexed entries for static author pages independently of featured selection. Never fetch GitHub repositories from visitors or infer attribution from repository owners.
3. Merge cached GitHub metadata (optional/null-safe).
4. Generate static detail, grouping, browse, and unfulfilled request pages.
5. Build Pagefind search index against generated HTML.
6. Use Lychee to check generated internal/local links and outbound URLs.
7. Keep last successful static output if any critical build input cannot be validated.

## Public JSON exports

Astro prerenders `/data/catalog.json` and `/data/requests.json` into static files during the frontend build. Project, tool and request records come from Astro content collections; canonical originals, featured selections and addition dates come from the same validated YAML catalog loader used by the site. YAML and content collections remain authoritative. Generated JSON is a public output, never a separate database or an editable source. Serving these files requires no server execution, database queries or runtime API calls.

`apps/frontend/remade-wiki/src/lib/catalog-export.ts` defines explicit public field allowlists using Valibot. Unknown source fields, collection IDs and future editorial metadata are stripped before serialization. Both documents have `schemaVersion: 1` and `site`; records are sorted by slug for deterministic output. Once exports are in use, breaking changes to the public contract require a schema version change and documentation update.

The response helper declares JSON content type, one-hour public caching and `Access-Control-Allow-Origin: *`. Static response headers are configured separately in `apps/frontend/remade-wiki/public/_headers` for Cloudflare Pages, because build-time Response headers are not embedded in the JSON files. Other static hosts should apply equivalent headers. JSON updates when the site rebuilds, and clients may cache it for an hour.

## LLM discovery

`apps/frontend/remade-wiki/public/llms.txt` is a maintained Markdown guide published unchanged at `/llms.txt`, following the [llms.txt proposal](https://llmstxt.org/). It summarizes the directory's scope and listing caveats, then links to the existing public JSON feeds, browsing pages, policy, catalog schema and contribution documentation. Keep it concise; catalog records remain in the generated feeds rather than a second manually maintained project list. Do not advertise unpublished features. The shared document layout links to it using `rel="describedby"`, and Cloudflare Pages serves it as UTF-8 plain text with one-hour public caching through `_headers`. It complements the sitemap and does not change `robots.txt` crawling rules.

## CI security

- On forked PRs, use `pull_request` with minimal read permissions; never run arbitrary repo scripts with elevated secrets under `pull_request_target`.
- PRs are untrusted: validate YAML with safe parsing, reject credential-like URLs and file paths, and render all submitted text as escaped/plain text (not arbitrary HTML).
- Restrict contributor PRs from editing `apps/frontend/remade-wiki/src/content/catalog/featured.yaml` without maintainer review; editorial approval cannot be inferred from their submission.
- Keep secrets out of catalog and PR logs. Only the trusted scheduled workflow can access the App private key and mint a short-lived installation token. PR checks continue with minimal built-in `GITHUB_TOKEN` permissions.
- Static build should not fetch from URLs submitted by users except tightly controlled link check/metadata requests. No arbitrary executable download or code execution.
- Avoid dangerous `yaml.load`; use `safe_load` and validate types. Check domain and URL structure to reduce SSRF or unexpected hosts.

## Handling failures

| Failure | Expected behavior |
|---|---|
| GraphQL timeout/rate limit | Keep previous snapshot; retry conservatively next refresh |
| Missing/renamed GitHub repo | Mark for review; don't silently remove catalog entry |
| Broken external link | Fail new-entry PR check or notify maintainer in periodic audit |
| Third-party 403/429 | Investigate; don't blanket-whitelist the host |
| Invalid schema/duplicate project | Block merge via required validation |
| Broken featured reference | Fail validation or warn while omitting the missing card (prefer fail in CI) |
| Removed featured project | Remove/edit featured manifest in same PR |

## Dependencies

Astro, React, strict TypeScript, Tailwind CSS, Valibot, Pagefind, Python 3 with uv-managed PyYAML for catalog validation and metadata scripts, and Lychee in CI. React components provide the shared UI and page content; Astro handles static routes, document metadata, and build-time catalog loading. Tailwind utility classes style the UI, with global CSS limited to theme tokens and base defaults. With the Astro React integration, React components render to HTML at build time by default and send no React runtime to visitors. A `client:*` directive opts a component into browser hydration; use hydration only for interactions that need it, with focused components and a working static browsing baseline. See [Astro’s framework component documentation](https://docs.astro.build/en/guides/framework-components/).

Reference: https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api

## Package manager

Use pnpm for frontend dependencies, lockfile and task scripts. Commit `pnpm-lock.yaml`; declare the pnpm version in `package.json` using `packageManager`. Do not introduce `package-lock.json` or Yarn.

## Python tooling

Use **uv** for every Python dependency and execution in CI and automation. Python dependencies are declared in `scripts/pyproject.toml`, managed as a single uv project inside `scripts/`, and installed by uv automatically during CI runs. The `scripts/uv.lock` file is generated by uv and should be committed once dependency resolution has been completed. Validation, testing, and metadata refresh happen automatically without contributor setup.

## Refined Directory review candidate

The directory projection in `src/lib/directory.ts` adapts existing validated catalog records for the shared browse cards and compact home/form search. Browse pages prerender 24 records plus crawlable `/explore/page/<n>/` and `/requests/page/<n>/` routes; existing detail URLs and public exports stay unchanged. `/requests/new/` is excluded from indexing and the sitemap. Its development-only form uses typed local auth/delivery simulations and session-storage drafts; production offers the current external GitHub request form. No submission endpoint or production migration is introduced. See [the experiment report](experiments/refined-directory/README.md) before activating website submission.
