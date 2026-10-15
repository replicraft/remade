# Catalog Schema and Editorial Data

## Canonical sources

```text
apps/frontend/remade-wiki/src/content/catalog/
  originals.yaml           Canonical original programs/interfaces
  featured.yaml            Maintainer-selected project slugs in display order
  projects/<github-user>/<slug>.yaml     One community-submitted reimplementation each
  tools/<github-user>/<slug>.yaml        One supporting tool each; separate from reimplementations
  requests/<vendor>/<original-slug>.yaml  One unfulfilled community request for the original
examples/project.yaml      Example only: never indexed

cache/github-metadata.json Cached API enrichment, not source of truth
```

Use **stable, URL-friendly slugs**; names may change, but slugs should remain stable to avoid broken URLs. Each original may have multiple projects, and a project may target several originals using its required `originals` list. Do not automatically derive stable original slugs from free-text names.

## Astro content integration

The source files live under `apps/frontend/remade-wiki/src/content/catalog/`, matching the Astro app's content layout. `apps/frontend/remade-wiki/src/content.config.ts` defines separate project, tool, and request loaders. They use the recursive YAML loader in `apps/frontend/remade-wiki/src/lib/catalog.ts` and strict Valibot schemas in `apps/frontend/remade-wiki/src/lib/schemas.ts`; validation runs inside the loaders because Astro’s schema option expects Zod. `originals.yaml` and `featured.yaml` remain shared reference/curation files. The static build and Python CI both enforce cross-file relationships and duplicate rules. Documentation examples are never indexed.

## Canonical original record

`apps/frontend/remade-wiki/src/content/catalog/originals.yaml` contains a list (empty `[]` until seeded):

```yaml
- slug: example-software
  name: Example Software
  url: https://example.org/software
  category: other
  aliases:
    - Example App
```

An original record identifies the **target**, not a hosting or endorsement relationship.

## Author grouping by GitHub user

Projects and tools accept optional `authors: [storytold]`: a nonempty, duplicate-free list of lowercase GitHub user or organization handles. Handles are 1–39 characters using letters, digits and single internal hyphens. Use handles directly; there is no authors registry or separate display-name mapping. Multiple credited authors are supported. Omit the field when attribution is unknown. Requests do not have authors.

Credit authors explicitly rather than inferring authorship from repository ownership, contributors or dependencies. The GitHub handle can differ from the repository owner, and non-GitHub repositories remain eligible. Validation checks syntax, not ownership or profile existence.

Organize attributed files as `projects/<github-user>/<slug>.yaml` and `tools/<github-user>/<slug>.yaml`, using the first credited author for the folder. For example, PhotoCraft lives at `projects/storytold/photocraft.yaml`. Keep one file per entry even with multiple authors. The `authors` field remains authoritative for attribution and grouping; folders are organizational. Entries without established attribution may remain at the collection root. Load both collections recursively, enforcing slug and repository uniqueness across all author folders. Original and request records remain shared and keyed by original slug; featured selections and public project URLs continue to use global entry slugs.

`entries_by_author` derives groups directly from validated project and tool YAML, sorts them deterministically, and keeps separate project/tool lists. Grouping includes every attributed indexed entry independently of Featured. The static `/authors/[github-user]` route uses the handle directly: ArtCraft entries with `authors: [storytold]` appear at `/authors/storytold`. This does not automatically import or publish other repositories.

Entry cards, detail pages and featured cards show **View More by Author**, labeled with the GitHub handle and linked to that route. Multiple authors get separately labeled links. Omit links when no author is recorded. Author pages include every explicitly attributed entry, with separate reimplementation and supporting-tool sections.

## Project record

`apps/frontend/remade-wiki/src/content/catalog/projects/<github-user>/<slug>.yaml` has the fields below:

```yaml
slug: example-implementation
name: Example Implementation
repository: https://github.com/example/example-implementation
originals: [example-software]
category: other
languages: [Rust]
platforms: [Linux, macOS, Windows]
status: experimental
compatibility: partial
description: Independent implementation targeting the original program's behavior.
license: MIT
# docs: https://example.org/docs       # optional
# website: https://example.org         # optional official project website
# mirrors: [https://codeberg.org/example/example-implementation] # optional
# limitations: Not all formats are currently supported. # optional
```

### Types and validation

| Field | Required | Notes |
|---|---|---|
| `slug` | Yes | Lowercase `[a-z0-9]+(-[a-z0-9]+)*`; matches YAML filename |
| `name` | Yes | Short nonempty project name |
| `repository` | Yes | Public HTTPS repository root URL. GitHub entries must use `https://github.com/<owner>/<repo>` without trailing slash, `.git`, subpath, query, or fragment. Other Git hosts (including self-hosted Git) may be accepted after maintainer review. |
| `originals` | Yes | Nonempty list of distinct canonical target slugs in the originals list. Each target requires editorial review and honest scope notes. Keep one project/repository listing: it appears on every target's software page and in searches for all targets. There is no primary target; single-target projects use a one-item list. |
| `category` | Yes | `creative`, `productivity`, `engineering`, `operating-systems`, `games`, `developer-tools`, `protocols`, `other` |
| `languages` | Yes | Nonempty list of programming language names |
| `platforms` | No | Optional list of platforms |
| `status` | Yes | `planned`, `experimental`, `alpha`, `beta`, `stable`, `archived` (self-reported except GitHub archive flag) |
| `compatibility` | Yes | `targeting`, `partial`, `high`, `claimed-complete` (self-reported) |
| `description` | Yes | Plain text, factual, no user-supplied HTML |
| `license` | Yes | SPDX-style identifier, e.g. `LicenseRef-custom` for review, or `Unlicensed` for a maintainer-approved project with no license grant. `Unlicensed` is not the SPDX `Unlicense` dedication. |
| `docs` | No | HTTPS URL |
| `website` | No | Public HTTPS URL for the implementation's official website. Displays an Official website button on its implementation page, opening in a new tab. Omit when no official website is documented. |
| `mirrors` | No | Nonempty list of distinct public HTTPS repository root URLs, following the `repository` URL rules. Supply documented mirrors of the same implementation, not forks or competing projects. Shown on the implementation page as Repository mirrors, opening in new tabs. |
| `limitations` | No | Short plain text |
| `authors` | No | Nonempty, duplicate-free list of lowercase GitHub handles |

Compatibility is not scored by Remade. `claimed-complete` is **not** a certification.

Use `planned` for projects accepted under POLICY.md whose current substance is research, plans or scaffolding, with no meaningful implementation yet. Its badge reads **Planned**. Use `compatibility: targeting`, describe intended features as plans, and state the lack of working software in `limitations`. Languages may identify the documented intended implementation language at this stage. Unknown maturity alone does not justify this status. Accepted planned listings replace corresponding requests under the usual uniqueness rule; their badge and limitations must make their stage clear.

### Choosing a category

Use the most specific group that describes the software's primary purpose, consistently across its original and project records:

- `creative`: illustration, photography, animation, video, audio, publishing, and creative design.
- `productivity`: documents, PDFs, spreadsheets, presentations, and office workflows.
- `engineering`: CAD, drafting, modeling, technical design, mapping, GIS, and spatial analysis.
- `other`: software that does not fit a more specific category.

The remaining groups cover operating systems, games, developer tools, protocols, and other software. Supporting tools remain separately labeled Tools.

### Uniqueness

- `slug` and filename must agree.
- No duplicate normalized repository URLs, using host and namespace/repository identity.
- No duplicate original slugs. A corrected name should use `aliases` instead of creating a second original.
- Prefer stable slugs. A display-name change or author-folder move does not require a new slug or public URL. If a project slug changes, add a temporary redirect from `/projects/<old-slug>/` to `/projects/<new-slug>/` in the same PR, unless maintainers explicitly approve an exception under `POLICY.md`. Update featured selections, supporting-tool references and any earlier redirects to the current slug; do not reuse old slugs for another project unless maintainers approve an exception. Add the old route to Astro’s `redirects` configuration and add explicit 302 rules for both trailing-slash forms in `apps/frontend/remade-wiki/public/_redirects` for Cloudflare Pages. The catalog loader uses these project redirect rules to include earlier slugs when finding the original Git addition date.
- Reject unknown fields (to catch typos) and malformed URLs.

## Project Request record

`apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml` describes a **desired reimplementation**, not an existing project:

```yaml
original: example-software
reason: A faithful and independently developed alternative implementation would be useful for study and compatibility.
suggested_names: [ExampleCraft] # optional
```

- Filename must match its `original` slug (which must exist in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml`).
- For entries or details sourced from a GitHub issue, add a YAML comment above the record linking to the source, such as `# Requested in https://github.com/replicraft/remade/issues/14.` Use `# Additional request details in ...` when an issue expands an existing request. Apply this convention to project and tool suggestions too; comments are contributor references, not schema fields or public UI content.
- `reason` is plain text, 20–400 characters, factual and non-promotional.
- Optional `suggested_names` is a nonempty list of plain-text names, each 2–100 characters. Names must be unique after case folding and whitespace normalization. These are naming ideas, not existing implementations or reserved names.
- Suggested names must be distinct from existing software brands and must not imply affiliation. Follow the naming requirement in [POLICY.md](../POLICY.md#5-submission-requirements); semantic brand-confusion review is a maintainer responsibility, not a schema check.
- No repository, popularity count, bounty, fundraising, deadline, ownership claim, or invented implementation status.
- Exactly one open request per original.
- **Do not list requests for any original with an indexed project, across its entire `originals` list.** The catalog validator enforces this; remove requests for every covered target in the same PR that first adds its implementation.
- A request has a stable link to `/software/<original-slug>` and is displayed on `/requests` and under **Project Requests** on the homepage.
- Requests are distinct from projects and are never mixed into featured listings or project counts. Upvote and builder totals are separate runtime enhancements documented in `PROJECT_REQUESTS.md`; never add them to request YAML or the static JSON exports.
- Request vendor filters derive their grouping from the first folder below `requests/`; root-level files are Unassigned. Vendor and Git addition dates are computed browsing metadata, not editable YAML fields, and do not affect public routes.
- Request targets do not prescribe application boundaries: one implementation may cover related targets such as the Substance 3D apps, or separate applications may share an engine. Capture these possibilities in the request reason without claiming that an implementation already covers them.

## Public machine-readable exports

- `https://remade.wiki/data/catalog.json`: `{ schemaVersion, site, originals, projects, tools, featured }`. Originals include `slug`, `name`, reference `url`, `category`, optional `aliases` and absolute `pageUrl`. Catalog exports use `schemaVersion: 1`. Projects expose the required `originals` array and the other documented public project fields plus optional Git-derived `addedAt` and absolute `pageUrl`. Tools expose their public fields, optional `addedAt` and absolute `pageUrl`. `featured` preserves the curated list of entry slugs. Cached GitHub statistics are not part of this contract.
- `https://remade.wiki/data/requests.json`: `{ schemaVersion, site, requests }`. Request exports retain `schemaVersion: 1`. Each open request includes `original`, `reason`, optional `suggested_names`, derived `vendor`, optional `addedAt` and a `software` object containing the original's public fields and absolute software `pageUrl`.

Both files use ISO timestamps when addition dates are available and slug order independent of UI sorting. Optional fields are omitted when unavailable. Fields are explicitly allowlisted; source comments and internal editorial fields are not exported. Generate these files through Astro builds, not by editing or committing generated JSON. Anyone can read them cross-origin; see [Architecture](ARCHITECTURE.md#public-json-exports) for caching and serving headers.

Only language badges hide JavaScript when TypeScript is also recorded, including the JS/TS abbreviations. Detail lists, comparisons, catalog data and public exports retain both languages; search and language filters still match both. Tools display language badges alongside their Tool label. Show a maturity badge only when `status` is recorded; omit the badge when status is undocumented.

## Supporting tool record

`apps/frontend/remade-wiki/src/content/catalog/tools/<github-user>/<slug>.yaml` describes an add-on to existing indexed projects:

```yaml
slug: example-tool
name: Example Tool
languages: [JavaScript]
repository: https://github.com/example/example-tool
url: https://example.org/tool
platforms: [Web] # optional
license: MIT # optional; use the documented license identifier
description: A browser launcher that adds access to the indexed implementation.
projects: [example-implementation]
```

All seven fields are required; unknown fields are rejected. `slug` must match the filename and share a unique namespace with project slugs. `name` is 2–100 plain-text characters and `description` is 20–400. `repository` follows the project repository URL rules and must be unique across projects and tools; `url` must be public HTTPS. `projects` is a nonempty, duplicate-free list of existing project slugs. This relationship identifies what a tool extends, without inventing an original or compatibility claim. A repository link does not imply an open-source license; tool licensing must be reviewed from its sources.

Tools require `languages` (a nonempty list of 1–40 character names). They also accept optional `mirrors` (a nonempty list of unique canonical repository URLs, following the project mirror rules), `status` (the project maturity enum, maintainer-reported), `docs` and `website` (public HTTPS URLs), and `limitations` (2–400 plain-text characters). Tools inherit categories from the indexed projects they support, using every distinct category when they extend multiple projects. These derived categories appear on detail pages and match Explore category filters; the Supporting tools filter remains available. Tool card badges follow this order: Tool, documented Status, Language, and Stars when metadata is available. Categories are not card badges. No separate tool category field is needed.

Tool pages share the project details layout and Repository Mirrors accordion, including “No mirrors found” when absent, and retain their “Works with” listings. These fields use the project validation rules, appear on tool pages and are included in public JSON exports. Record known dependencies and scope limits in `limitations`; supply documented languages and do not invent development status. Tools retain their project references rather than original targets or a reimplementation compatibility rating.

Tools accept optional `license`, a 2–80 character plain-text license identifier, included in public JSON exports and shown on tool pages. Omit it when unknown; the page displays “Not documented”. Do not infer a license from public source availability. Tools also accept optional `platforms`, a list of 1–40 character plain-text platform names under the same rules as projects. Use `Web` for browser-based tools and list only documented platforms. Optional `authors` follows the same GitHub-handle rules as projects. Load tools separately using `collect_tools`; `collect` validates their project references and author handles while preserving its existing return shape. Tools never count as implementations or fulfill requests. Future pages must label them **Tool** and keep their collection separate from original-target listings.

## Featured manifest

`apps/frontend/remade-wiki/src/content/catalog/featured.yaml` contains just project slugs, in editorial order:

```yaml
# Maintainer-curated; independent of contributor project metadata.
- project-a
- project-b
```

Every featured slug must point to a valid project or supporting tool. Preserve manifest order and label featured tools **Tool**. Contributors cannot self-promote by setting a field in their own entry.

## Metadata cache

`cache/github-metadata.json` stores a mapping under `repositories`:

```json
{
  "repositories": {
    "owner/repo": {
      "stars": 123,
      "forks": 4,
      "primaryLanguage": "Rust",
      "pushedAt": "2026-10-01T10:00:00Z",
      "isArchived": false,
      "licenseSpdx": "MIT",
      "fetchedAt": "2026-10-09T08:00:00Z"
    }
  }
}
```

Values in the example are illustrative; a real snapshot only contains successfully fetched metadata. Cache fetch time is **not** the project's last push time. Failure to fetch one repository preserves its previous record.

Repository statistics are collected for GitHub-hosted repositories only. Non-GitHub projects may be listed and will have no GitHub stars or forks. Do not fabricate missing metadata.
