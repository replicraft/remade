# AGENTS.md: Working on Remade

This file is the fast-start guide for coding agents and human contributors. Read it before changing the repository. Detailed product decisions live in the linked documents; **do not duplicate or silently override those rules here**.

## Project at a glance

- **Name / site:** Remade: `remade.wiki`
- **Tagline:** **Everything can be remade.**
- **Purpose:** A polished, community-maintained directory of open-source, independently authored reimplementations aiming for faithful behavior or compatibility with existing software.
- **Tools:** Add-ons to indexed projects are allowed under `apps/frontend/remade-wiki/src/content/catalog/tools/`; see `POLICY.md` and `docs/CATALOG.md`. They may be featured with a Tool label but do not count as reimplementations or fulfill requests.
- **Initial editorial scope:** Reimplementations of software whose *original implementation* is not open source. This belongs in `POLICY.md`, not necessarily in the marketing hero.
- **Not:** An alternatives marketplace, clone generator, file host, project certifier, or an implementation of the indexed software.
- **Brand:** `#15191F` charcoal, `#C4F477` lime, white; overlapping-squares icon in `apps/frontend/remade-wiki/public/favicon.svg`.
- **Home:** Hero → search → Featured → categories → recent entries → **Project Requests** → footer.
- **Editorial/legal:** `POLICY.md` is authoritative on eligibility. `/disclaimer` uses `content/DISCLAIMER.md`; footer links to `/disclaimer` but must **not** display `admin@remade.wiki`. The email belongs on the disclaimer page only.

This repository includes a runnable static Astro application in `apps/frontend/remade-wiki/`. Root pnpm commands delegate to that workspace. Run `pnpm dev` for development and `pnpm build` to generate the site and Pagefind index. Catalog validation uses strict Valibot schemas in the TypeScript loaders and the existing Python checks.

## Source of truth / reading order

1. `POLICY.md`: eligibility, independence requirements, moderation and project requests.
2. `docs/CATALOG.md`: canonical YAML shapes, enums, identities, and uniqueness rules.
3. `PLAN.md` and `docs/DESIGN.md`: pages, content, search, UI, accessibility.
4. `docs/ARCHITECTURE.md` and `docs/CI.md`: static build, GraphQL cache, link checks.
5. `ROADMAP.md`: which features to implement next, not a competing specification.
6. `CONTRIBUTING.md`: human-readable PR flow.

When requirements conflict, make the inconsistency explicit and update the relevant source document rather than inventing an exception.

## Engineering rules

- Split each batch into small, logical, conventional commits, with one coherent purpose per commit. Keep a feature or schema change together with its necessary data migration, tests, and documentation; commit unrelated catalog additions, UI changes, and policy changes separately. Separate shared-file changes by hunk when needed, account for every requested change, and leave unrelated user files untracked or unstaged.
- For the first local commit in a batch, run one command: `git pull --ff-only && git add <explicit file paths> && git commit -m "<message>"`. Subsequent commits in the same batch use `git add <explicit file paths> && git commit -m "<message>"` without another pull. This includes upstream changes, including automated metadata updates, before the batch. If pulling fails, resolve the issue before committing; do not automatically rebase, reset, or discard local work.
- **Astro + React + strict TypeScript + Tailwind**, statically generated pages. Use Pagefind for static search and the generated catalog for local filtering/sorting.
- **pnpm only** for JavaScript dependencies and scripts. Commit `pnpm-lock.yaml` and specify an exact `packageManager` in `package.json`. Do not introduce npm or Yarn lockfiles, npm commands, or deployment-specific setup.
- Keep JavaScript optional for core browsing. Astro and React components are both suitable for static UI: React components render to static HTML by default in Astro, without sending the React runtime to the browser. Use React for shared UI and page content, with Tailwind utility classes for styling. Keep Astro for document layouts, static routing, and build-time data loading; add `client:*` hydration only when browser interaction requires it, and keep hydrated components focused.
- Follow the source readability rules in `docs/DESIGN.md`: add natural blank lines between logical code blocks and test cases, keep Astro/HTML tag brackets intact, and keep app-wide formatting in a separate commit. Use Biome; do not add another formatter.
- Implement single-purpose modules and components. Prefer explicit types, schema validation, predictable pure functions, and readable naming over clever abstractions. Avoid `any`, hidden global state, and premature plugins.
- Catalog browsing remains static: no live visitor requests to GitHub or a catalog database. The separate Rust Worker in `apps/backend/remade-api/` supports GitHub login and request upvotes/builder indications, with D1 users, identities, hashed sessions and separate request activity tables; see `docs/AUTH.md` and `docs/PROJECT_REQUESTS.md`. Anonymous browsing must make zero authentication API requests. Approved **pull requests**, not accounts, issues or labels, remain the publishing workflow: **merge = publish; close = decline**.
- Keep catalog data separate from computed metadata. Community files under `apps/frontend/remade-wiki/src/content/catalog/` are source of truth. `cache/github-metadata.json` is a replaceable best-effort cache, refreshed approximately every 24 hours by trusted CI.
- Stats authentication: the trusted daily workflow creates an installation token with `actions/create-github-app-token@v3` from `REMADE_GH_APP_CLIENT_ID` and `REMADE_GH_APP_PRIVATE_KEY`, passes it as `GH_METADATA_APP_TOKEN` to the collector, and uses that App token to push the refreshed cache. The App needs Contents: Write and bypass permission for the rules protecting main. Keep App secrets out of pull-request workflows; see `docs/CI.md`.
- Treat contributions as untrusted input: parse YAML safely, reject unknown fields and duplicate keys, validate identifiers/URLs, escape user-authored text, and never execute code from a listed repository. Don't place elevated secrets in workflows that run PR code.
- Avoid guessed stars, fabricated compatibility claims, fabricated activity, or inferred legality. Clearly distinguish maintainer-reported compatibility from independently verified facts.
- Build for accessibility: semantic HTML, visible focus, keyboard functionality, contrast, sensible screen-reader labels, reduced motion, and responsive layouts (including small mobile viewports).
- Frontend tests use Vitest for unit logic, `vitest-browser-react` for React components and Playwright for separate E2E flows. Use `pnpm test:unit`, `pnpm test:react`, or `pnpm test:e2e`; `pnpm test:auth` runs local Worker/D1 integration tests owned by the frontend; `pnpm test` runs all four suites. Keep JavaScript auth tests in the frontend test tree and native Rust security tests in the backend. CI runs unit tests only; browser suites are local. Do not use Node's test runner or React Testing Library.
- Add focused automated tests when changing parsing, request fulfillment, schema rules, metadata ingestion, or other nontrivial logic; keep CI green before merging.
- Leave test execution to CI unless the user explicitly asks for local test runs. Do not run tests after each change. Keep the configured commit hooks enabled; their linting, formatting and type checks still run on commit.
- Legal explanations stay qualified. Do not promise that all clean-room implementations are lawful or imply Remade can certify their provenance. Don't replace the carefully scoped disclaimer with blanket non-liability language.
- Auth production database creation, remote migrations, secret provisioning and deployment require explicit operator approval. Local auth migrations and verification are allowed; keep production steps manual. Mail-provider setup remains out of scope.

## Add a reimplementation entry (pull request)

1. Read `POLICY.md` and check that the project is independently authored, has public source, and aims at specific observable compatibility. Record its open-source license, or `Unlicensed` when a maintainer approves a project without a license grant; never confuse this with `Unlicense` or imply reuse rights. Research, plans or scaffolding without meaningful implementation may be listed only as `planned`, with planned functionality clearly identified. Broader alternatives may be included with maintainer approval, subject to the other eligibility requirements. A port, fork, or wrapper of the original implementation is not sufficient.
2. Search `apps/frontend/remade-wiki/src/content/catalog/projects/**/*.yaml` for duplicate project/repository entries. Search `apps/frontend/remade-wiki/src/content/catalog/originals.yaml` for the target and its aliases; **reuse its canonical slug** if it exists.
3. If the original is not in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml`, add a record with `slug`, `name`, `url`, `category`, and optional `aliases`; use an official or credible HTTPS reference. Do not create a second record because of alternate spellings.
4. Copy `examples/project.yaml` into `apps/frontend/remade-wiki/src/content/catalog/projects/<github-user>/<project-slug>.yaml`. Replace **all** example values. Ensure `slug` matches its filename and the required nonempty `originals` list contains distinct canonical target slugs; supply truthful language, license, status, compatibility target, description, and optional limitations/docs.
5. If this is the first published implementation of a target, **delete** its `apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml` in the **same PR**. Apply this to every target in the project's `originals` list. Use one project record for multi-target implementations; a request and an indexed project cannot coexist for any of its targets.
6. Do not modify `apps/frontend/remade-wiki/src/content/catalog/featured.yaml` to feature your own submission; that file is maintainer-curated.
7. Automated CI validates YAML, references, tests and links. Address any failures; do not silence Lychee for convenience.
8. Open a PR using `.github/PULL_REQUEST_TEMPLATE.md`, summarize the compatibility target and sources, and tick: **“I have read and will adhere to POLICY.md.”** Maintainers may merge, request changes, or close the PR.

## Catalog Suggestions and Project Requests (GitHub Issue Forms)

- The issue form at `.github/ISSUE_TEMPLATE/catalog-suggestion.yml` is for existing reimplementations whose finders do not wish to prepare YAML.
- Issues labeled `catalog-suggestion` or `project-request` trigger `.github/workflows/review-submissions.yml`. The reviewer lives in `scripts/review_submission.py`. The workflow reads only the trusted default branch, validates form fields, checks duplicates and public GitHub metadata, then runs Lychee on supplied public HTTPS URLs.
- Unknown provider hosts receive exactly this advisory: **This does not link to a recognized Git provider. Proceed with caution.** Self-hosted Git is possible, so do not automatically reject suggestions on this basis.
- The bot writes or updates a single CI-style review comment with a prominent warning at the top for unrecognized Git hosts (or other issues), followed by severity-sorted findings, Lychee status, and explicit manual-review caveats. Broken or rate-limited links are flagged for human review; they do not automatically delete or publish a listing. Manual review is still mandatory.
- Never execute code, fetch arbitrary hostnames using `requests`, or interpolate issue bodies into shell/YAML expressions. GitHub API endpoints must be constructed from validated identifiers.
- Both `catalog-suggestion` and `project-request` must exist as GitHub labels for the forms to apply them.
- `.github/ISSUE_TEMPLATE/project-request.yml` allows Project Requests with no repository URL or other links. Such requests receive a review comment, with Lychee skipped when no URLs exist. Request issues do not publish catalog entries; those still require a PR.
- Request issues require the original software name, a description of what it does and a reason explaining what current open-source alternatives lack. Suggestions require the source repository URL and original software name.

## Add a Project Request (pull request)

1. Confirm the target has **no indexed qualifying project** and no existing request. Requests are wanted implementations, **not announcements of existing work**.
2. Reuse or add the canonical original in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml`.
3. Copy `examples/request.yaml` into `apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml`; set `original` to that slug and write a short, specific `reason` explaining the compatibility behavior wanted.
4. Submit a PR with the required policy acknowledgment. Automated checks run on the pull request.
5. Request cards render under **Project Requests** and `/requests`; remove the request when an implementation is accepted.

Requests may include optional `suggested_names` for naming ideas. Only propose names that are distinct from existing software brands and unlikely to be confused with them; follow the naming requirement in `POLICY.md`. Supporting tools reference indexed project slugs; copy `docs/examples/catalog/tools/tool.yaml` and follow the policy's supporting-tools rules.

For corrections, edit the original YAML through a PR and cite supporting public sources. For policy exceptions, ask maintainers; don't work around the validator.

## Automated checks and tooling

- **Python 3.14 pinned in `scripts/.python-version`**, managed exclusively through uv. Use Typer rather than argparse, `validators` for URL syntax, `requests` for HTTP calls, explicit types, and modern Python syntax. Never use `from __future__ import annotations` or return integer success codes from CLI functions. Python validation, tests, submission review, and metadata scripts run automatically in CI through the single uv project in `scripts/`. There must be no `requirements.txt` or per-script dependency environments. Commit `scripts/uv.lock` after it is successfully generated; until then, uv will resolve dependencies automatically in CI.
- Lefthook runs staged-file formatting and linting on commit, plus relevant Python type checks. Let the hook stage formatting fixes; resolve failures rather than bypassing it. See `docs/CI.md`.
- The root `justfile` exposes frontend, Python and backend commands; keep uv commands out of `package.json`. Frontend recipes delegate to pnpm. Python recipes live in `scripts/justfile` under root `mod py` (for example, `just py::check`) and use the single scripts uv project. Backend recipes live in `apps/backend/remade-api/justfile` under `mod backend` (for example, `just backend::test`); see `docs/AUTH.md`. See `docs/CI.md` for CI checks.
- Python scripts use Ruff for linting and formatting and ty for type checking, through the existing uv project. Use Pydantic for structured runtime validation where useful; keep catalog schemas and duplicate-key safety aligned with the frontend. See `docs/CI.md` for local commands.
- **pnpm only** for the Astro frontend. Frontend build checks also run automatically in GitHub Actions when the app exists.
- Catalog contributors need no manual tooling setup.
- CI runs Lychee for PR catalog URLs and separately for suggestion-issue URLs, with periodic full-catalog audits. Investigate 403/429 false positives rather than broadly ignoring hosts.

## Definition of done

- Change meets `POLICY.md` and the appropriate catalog schema.
- Tests and relevant link checks pass, or documented external false positives are escalated.
- Site remains static, accessible, and faithful to the Remade visual/brand rules.
- New records appear under the correct original; resolved requests disappear; stats failures never make approved entries disappear.
- Docs/examples are updated whenever a public field, workflow, or user-facing behavior changes.
