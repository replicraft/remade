# Continuous Integration / Maintenance Plan

Catalog CI remains independent of deployment. Authentication Worker validation and manual Cloudflare setup are documented in [AUTH.md](AUTH.md); GitHub Actions never deploys the Worker or applies production migrations. Email-provider setup remains outside this project.

For GitHub Issue Forms, create the labels `catalog-suggestion` and `project-request` before enabling submissions. These labels select the appropriate review rules.

## PR checks

Python-based checks run automatically through **uv** using the pinned Python requirements. The setup action uses uv 0.13.0, works in `scripts/`, and keys its cache from both `pyproject.toml` and `uv.lock`. JavaScript actions use Node 24 runtimes, independently of the frontend Node version selected by each workflow. Contributors are not asked to run local commands.

Python tooling uses Ruff for linting and formatting and ty for type checking, configured in `scripts/pyproject.toml` and locked in `scripts/uv.lock`. CI runs all three checks before validation and pytest. Run `just py::lint`, `just py::format` or `just py::check` locally. Pydantic strictly validates incoming GitHub repository metadata before updating the cache; malformed records preserve the previous successful entry while other repositories continue refreshing.

Python tests use pytest, with temporary catalog fixtures, parametrized validation cases, and mocked HTTP calls. Run them locally with `uv run --project scripts pytest scripts/tests -v`; pytest discovers only `scripts/tests/` using the configuration in `scripts/pyproject.toml`.

1. `checks.yml` validates all catalog YAML (projects, supporting tools, originals, **requests**, featured), confirms PR checkbox, and catches duplicate repositories, duplicate slugs, unknown tool project references and fulfilled requests. Tools never fulfill requests.
2. `links.yml` (**Dead Link Checker**) checks only newly introduced URL values in changed catalog files on PRs and pushes. Existing URLs in edited files, including `originals.yaml`, are subtracted using the base revision. This workflow does not install frontend dependencies or build Astro. Link-check failures are advisory and do not fail the workflow; setup failures still do. Each Lychee step logs individual results, has a 10-minute limit, and saves its Markdown report as an artifact when available. TLS certificate verification remains enabled. Pass generated URL lists as local text-file inputs, not `--files-from`: the latter treats each URL as a page to scan and can crawl unrelated external links.
3. `frontend-test.yml` (**App Build + Unit Tests**) always reports its required check, conditionally running advisory Biome linting, required frontend type checks, Vitest unit tests (`pnpm test:unit`), and production build. Lychee then checks local/internal links offline against that same build output, without another build or external requests, and saves an advisory report. Browser component and E2E tests run locally, keeping CI free of browser installation and startup. Frontend, workspace, metadata-cache, Biome and build-workflow changes trigger validation; unrelated changes skip expensive steps without leaving a required check pending.
4. All PR workflows run read-only, on untrusted forks, using `pull_request` (not `pull_request_target`). Do not execute scripts from submitted repositories.
5. `backend.yml` (**Auth Worker Validation**) always reports its check and conditionally validates changed backend/request-catalog/shared-tooling inputs. It runs Rust formatting, native and Wasm clippy, security tests, the official Wasm build and a fresh local D1 migration. Frontend-owned Worker/D1 integration tests run locally with `pnpm test:auth`. It needs no OAuth or production Cloudflare secrets.

## Issue suggestion and request checks

- `review-submissions.yml` runs when a `catalog-suggestion` or `project-request` issue is opened, edited, reopened, or labeled. `scripts/review_submission.py` validates both.
- The bot posts **one CI-style issue comment**, updating its existing marked comment on reruns rather than creating a new comment for every edit.
- Warnings appear at the **top** of that comment, ahead of all successful findings. A nonrecognized Git host receives the exact text: **This does not link to a recognized Git provider. Proceed with caution.**
- Catalog Suggestions require a repository URL. Project Request issues require separate software-description and reason fields; the reason should explain what current open-source alternatives lack. Links remain optional, with Lychee skipped when none are supplied.
- Below the warning: errors, warnings, informational metadata checks, and the Lychee result. Findings are advisory; maintainers decide whether to accept a suggestion.
- No contributor-supplied repository code runs in this workflow. `issues: write` is needed for the bot comment; it uses the built-in token rather than GitHub App metadata credentials.

## Scheduled checks

- `links-weekly.yml` (**Weekly Catalog Link Audit**) checks the full catalog every Sunday at 08:17 UTC; manual dispatch is supported. It runs no frontend build. Findings are advisory maintenance reports, not public deletions.
- `stats.yml` daily GraphQL metadata refresh on trusted default branch (manual dispatch supported). It uses an **organization-owned GitHub App installation token** for GraphQL reads and pushes of the metadata snapshot. Updates cached JSON if some repositories succeed, preserving older records for failed lookups.
- Pushes to `main` that change project or tool YAML also trigger metadata collection. This mode compares GitHub repository identities with the catalog at the push's previous commit and queries only newly introduced repositories. Existing repositories, renamed entries, original records and request files do not cause additional API queries. When none are new, token creation and cache writes are skipped. Scheduled and manual runs continue to refresh the full catalog; App secrets are never used on pull requests.

## Local task commands

The root `justfile` is the common entry point for frontend and Python tasks. Run `just` to list recipes. Frontend recipes delegate to pnpm (`just dev`, `just build`, `just check`, `just format`, `just test`, `just test-unit`, `just test-react`, `just test-e2e`, `just preview`, `just astro`); Python recipes live in `scripts/justfile`, exposed through the root `mod py`, and use the existing uv project (`just py::lint`, `just py::format`, `just py::check`, `just py::test`, `just py::validate-catalog`, `just py::metadata-refresh`). Python recipes run from `scripts/`; the metadata recipe loads `../.env` from the repository root. The root `package.json` delegates frontend commands to `apps/frontend/remade-wiki/` and installs shared Biome/Lefthook tooling; the frontend package owns its application dependencies and scripts. CI can invoke pnpm and uv directly without requiring just on the runner.

`types-pyyaml` and `types-requests` are development-only typing stubs for ty; they are not runtime dependencies. Keep them so calls into these libraries are type-checked.

## Commit hooks

The `prepare` script in `package.json` runs `lefthook install` during pnpm installation. Lefthook's dependency install script is also explicitly permitted by `pnpm-workspace.yaml`. Run `just hooks-install` to install it manually in an existing checkout. CI continues to run its own checks.

Before committing, Biome fixes and checks staged frontend files; Ruff fixes and formats staged Python files. Changed Python files or project configuration also trigger ty. Formatting fixes are automatically staged; remaining lint or type errors block the commit. Lefthook temporarily hides unstaged portions of partially staged files while running pre-commit jobs.

Biome covers JavaScript, TypeScript, JSX, TSX, Astro, HTML, CSS and JSON here. SVG assets and the generated `cache/github-metadata.json` are explicitly excluded. The metadata collector owns the cache serialization; formatting it during a PR merge creates unnecessary conflicts with automated refreshes. Its frontend CI step reports diagnostics without failing the required build check; frontend type checks, unit tests and production build remain required. It does not format Markdown, YAML or TOML; CI validates catalog YAML with the existing strict validator. These hooks do not run the browser suites.

## Local metadata refresh

Run `just py::metadata-refresh` from the repository root to refresh `cache/github-metadata.json` for all indexed GitHub projects and tools. The command uses the existing uv project and uv's built-in dotenv support; no additional dependency is needed.

Put the token in a repository-root `.env` file:

```dotenv
GH_METADATA_APP_TOKEN=your-github-token
```

Use a GitHub access token (such as an App installation token or personal access token), not the App's PEM private key or Client ID. `.env` files are ignored by Git. An existing `GH_METADATA_APP_TOKEN` in the process environment takes precedence over the file, and CI continues to supply its installation token directly.

Arguments pass through to the collector. `just py::metadata-refresh --list-only` lists selected repositories without making API calls or changing the cache. Use `--added-since <full-commit-sha>` to refresh only repositories introduced since a commit, or `--batch-size <number>` to change the batch size.

## GraphQL behavior

- The GitHub App installation has a **5,000 GraphQL point/hour/installation** baseline on GitHub.com for non-Enterprise organizations (potentially higher with scaling); a point is not a repository. Limits and per-field access may change.
- The built-in `GITHUB_TOKEN` is **not tied to a personal account** and could also fetch metadata, with a typical limit of **1,000 GraphQL points/hour/repository**. Use the App when the independent installation budget/identity is desired.
- Repository settings required for the trusted daily job:
  - Create a GitHub App owned by the Remade organization, with **Metadata: Read** and **Contents: Write**, and install it on the catalog repository. Approve the updated installation permissions if the App already exists.
  - Add the App to the bypass list for every ruleset protecting `main`, using **Always** bypass so direct cache pushes are permitted. For classic branch protection, allow the App to bypass the required pull request rule and any applicable push restrictions.
  - Set repository Actions secret `REMADE_GH_APP_CLIENT_ID` (App's Client ID).
  - Set Actions secret `REMADE_GH_APP_PRIVATE_KEY` (PEM contents), available only to the trusted repository/workflow; do not expose it to forked PRs, build logs, or the client bundle.
  - Use `actions/create-github-app-token@v3` to mint a one-hour installation token; the script reads `GH_METADATA_APP_TOKEN`. The workflow requests Contents: Write on this token and configures checkout with it before pushing `cache/github-metadata.json`. The built-in `GITHUB_TOKEN` only needs Contents: Read.
  - Test a public third-party repository in GraphQL: installation tokens may restrict certain nested fields for repositories **outside** the installation; if GitHub returns `Resource not accessible by integration`, simplify the query fields or use the built-in `GITHUB_TOKEN` for this read-only metadata job.
- Batched alias query at 25 repositories/request (configurable). Monitor reported cost and remaining points; avoid burst concurrency.
- A 24-hour refresh is **best effort**; the UI must show: **GitHub statistics are refreshed approximately every 24 hours.** If a cached record is older, its exact last-successful timestamp must remain discoverable.
- Metadata cache is not an eligibility source. GitHub API failures never remove listings.
- The workflow pushes `cache/github-metadata.json` using the App installation token. App-authenticated pushes can trigger downstream push workflows. The metadata workflow only listens for project/tool YAML changes, so its cache-only commits do not start another metadata refresh. Hosting setup is outside this package.

## Link checking

- Extract catalog URLs from validated YAML; do not depend on Lychee's best-effort YAML parsing.
- PR and push checks examine added URL values only, including replacement URLs and newly added mirrors; unchanged URLs are not rechecked.
- Weekly check checks all catalog links.
- `frontend-test.yml` runs Lychee with `--offline` on generated pages after its existing Astro build. External catalog URLs belong to the additions check and weekly audit, avoiding duplicate builds and external scans.
- Lychee accepts HTTP 403 responses globally. HTTP 429 rate limits and other errors are reported, but link-check failures do not fail the workflow. `.lycheeignore` is for documented, temporary exceptions.

## Security

- Keep checkout and workflow permissions at minimum. Never use powerful repo secrets to run PR-modified code.
- Validate HTTPS reference domains and GitHub repository URLs. No link-preview proxy or crawling arbitrary payloads at runtime.
- Render submitted descriptions escaped and never permit arbitrary HTML in catalog text.


## Python dependency management

The entire Python automation suite uses one uv project within `scripts/` and workspace definition in `scripts/pyproject.toml`. Python 3.14 is selected by `scripts/.python-version`, and GitHub Actions uses `astral-sh/setup-uv`. No `requirements.txt`, pip installation steps, or individual script environments are supported.

The initial package intentionally has no `scripts/uv.lock` because its dependencies could not be resolved in the artifact generation environment. The first connected uv invocation resolves and creates the lockfile automatically. Once generated, commit that file and use locked execution in workflows for stronger reproducibility. This does not require contributors to install anything or run setup commands locally.

## Frontend tests

Vitest configuration lives in `apps/frontend/remade-wiki/tests/vitest.config.ts`, `apps/frontend/remade-wiki/tests/vitest.react.config.ts` and `apps/frontend/remade-wiki/tests/vitest.auth.config.ts`. The frontend package scripts select each config explicitly; all use `apps/frontend/remade-wiki/` as their working root for test and fixture paths. Root pnpm commands delegate to that workspace, so the existing just recipes still work.

- `pnpm test`: runs the unit, React component, E2E and auth integration suites in sequence.
- `pnpm test:unit`: Vitest in Node for schemas, catalog relationships, exports, filtering and sorting.
- `pnpm test:react`: `vitest-browser-react` component tests in headless Chromium through Vitest's Playwright provider. These mount components directly and use browser locators and interactions; they do not start the Astro site.
- `pnpm test:auth`: builds the Rust Worker, then runs frontend-owned Vitest auth integration tests against local workerd and D1 with mocked GitHub responses. Requires the backend toolchain; this suite runs locally.
- `pnpm test:e2e`: builds Astro and Pagefind, then runs Playwright using `apps/frontend/remade-wiki/tests/playwright.config.ts` against the production preview server. It covers navigation, hydrated filtering, search fallbacks, static comparisons and generated data/discovery files.

The frontend `astro check` excludes `tests/auth/**`. Worker integration tests run separately from frontend application checks; the frontend CI workflow does not build or run the Worker.

Install the local browser once with `pnpm --filter ./apps/frontend/remade-wiki exec playwright install chromium`. The two browser suites are separate from each other and from CI. Neither uses React Testing Library. React tests receive a serializable catalog loaded by the test configuration; frontend content collections remain the source of truth. Python tests continue to use pytest.
