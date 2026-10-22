# Project Requests

**Homepage section:** Project Requests  

## Purpose

Show software and interfaces that community members want faithfully reimplemented but for which Remade currently has **no qualifying indexed implementation**. A request is **not a project listing**, announcement, challenge bounty, sign of legal permission, nor an assignment.

## Contributor experience

- Navigate to `/requests` from the homepage section.
- Browse requested originals, their reference links, the reason for a remake and any suggested names.
- Search `/requests` by software name, aliases, suggested names, vendor or requested features. Title matches rank first, with the selected sort breaking ties. Filter by vendor, category and addition date (past 7, 30 or 90 days, or the past year). Sort newest first, oldest first or alphabetically. Search and filters are reflected in the URL and can be cleared; browsing remains available without JavaScript.
- If a nonempty search finds no matching requests, show matching implementation cards and a link to Explore. Search original names and aliases, project names, descriptions, authors and languages independently of request-specific filters. Explain that listed implementations replace requests even during early development, and point readers to their status and limitations.
- Select **Submit a request** to open `.github/ISSUE_TEMPLATE/project-request.yml` for a link-free suggestion; maintainers review it and accepted catalog entries still require a PR adding `apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml`; create an original in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml` if needed.
- Select **Know an implementation?** to submit `apps/frontend/remade-wiki/src/content/catalog/projects/<github-user>/<slug>.yaml` by PR instead.
- Signed-in visitors can toggle **Upvote** and **I’m building this**, with one of each per account and request. Builder indications are self-reported interest, not verified implementations, assignments or reserved names. Display **Know an alternative? Add it to the catalog.** linking to contribution instructions. Login and both request controls are available in development and production. No runtime comments or automatic publishing. GitHub account required to open an Issue or PR.

## Rules and publication

- A request must target one canonical original slug and must be original-specific and factual.
- Search existing project records and request records before submitting.
- When a request or additional details come from a GitHub issue, preserve its URL in a YAML comment above the request record. Link each relevant issue without implying it originated a request that already existed.
- Validator rejects requests for originals with a project already indexed, across every target in the project's `originals` list.
- When the first qualifying project is accepted, remove the request record in that same PR; the implementation then appears under the original's software page.
- Maintainers have editorial discretion to decline/remove requests. Avoid invitations to copy code, redistribute copyrighted assets or circumvent access controls.

## Layout

- Homepage below Recently added: **Project Requests**: the three most recently added open requests, using catalog addition dates recorded in Git, **View all requests** link.
- `/requests`: compact card grid with original target name, category, plain-text reason, optional suggested names labeled as naming ideas, reference URL, and contribution CTA. Default to **Most upvoted**, using live totals once available; equal totals fall back to search relevance and newest additions. Before totals load or when runtime activity is disabled, use that same fallback order. Recently added, Oldest first and Alphabetical remain available.
- `/software/[slug]`: when an open request exists, display a gentle **No implementation listed yet** state with **Help make it happen** pointing to contribution instructions.
- When no requests exist, show a friendly empty state instead of fabricated cards.

## Technical model

`apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml` requires the `original` slug and a short `reason`, and accepts optional `suggested_names` as defined in `docs/CATALOG.md`. Requests are joined against `apps/frontend/remade-wiki/src/content/catalog/originals.yaml` and the set of projects during validation/build. Supporting tools do not fulfill requests. `apps/frontend/remade-wiki/src/content/catalog/requests/` files are PR-managed source data; the generated site is fully static. Issue requests are unlisted proposals until a maintainer merges an eligible catalog PR. Request issues may omit all links; catalog publication still requires the original reference URL.

## Request activity

Keep the controls compact, with visible upvote and builder totals for both signed-in and signed-out visitors. Put the builder explanation in a hover and keyboard-focus tooltip on an accessible info icon beside “I’m building this”; keep “Know an alternative? Add it to the catalog” underneath. An unauthorized action shows the toast “Login to vote” with a Login action opening the provider chooser, rather than expanding the card with a login prompt.

Catalog YAML and static JSON exports remain the source of truth for requests. Counters are separate runtime D1 records in `request_upvotes` and `request_builders`, tied to the provider-independent Remade user ID. They do not change request fulfillment or catalog publication. Visitors may withdraw either indication. Public totals come from one bulk `/api/v1/requests/activity` request per page, with no polling and no anonymous `/auth/me` calls. Logged-in responses include only the caller’s selected states; no builder names or user IDs are published. API failures leave static browsing available and show unavailable counters rather than fabricated zeros.

The same controls appear on the homepage request preview, `/requests` and open-request software pages. Existing login/logout changes refresh the active page’s counters. Request actions require a valid unexpired server session, a matching frontend Origin and an empty request body. Repeated enable/disable requests are idempotent; database uniqueness prevents duplicate indications. The Worker embeds a sorted allowlist of request filenames generated by `build.rs` from the canonical catalog during compilation. Unknown and fulfilled request slugs are rejected after redeployment; request catalog changes must trigger a Worker rebuild. Historical activity is retained but omitted from responses when a request leaves the allowlist.
