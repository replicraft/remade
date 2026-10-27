# Contributing to Remade

Remade is a community-curated directory. You can contribute by proposing a new listing, correcting an existing listing, or improving the website itself.

## Add a project

1. Read [POLICY.md](POLICY.md) to confirm the project is eligible. Broader alternatives require maintainer approval.
2. Search `apps/frontend/remade-wiki/src/content/catalog/projects/` to make sure it has not already been listed.
3. Reuse the original record in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml` (or add it if missing), then fork the repository and add one YAML file at `apps/frontend/remade-wiki/src/content/catalog/projects/<github-user>/<project-slug>.yaml`. Use `examples/project.yaml` as a template, but replace all placeholder values.
4. Open a pull request. Complete the description and check the policy acknowledgment in the PR template.
5. Automated validation and link checks will run. A maintainer can merge, request changes, or close the pull request.

Please keep submissions factual and concise. Only the project's external links and basic metadata are needed; do not add original executable files or assets.

When renaming a listed project, keep its slug unless the public URL needs to change. Unless maintainers explicitly approve an exception, a slug change must include a temporary redirect from the old `/projects/<slug>/` URL to the new page in the same PR, update catalog references and earlier redirects, and verify that existing links still reach the current implementation page. See the URL stability requirement in [POLICY.md](POLICY.md).

## Suggest an existing project via an issue

If you know of an eligible reimplementation but do not want to prepare a YAML entry, [open a Catalog Suggestion issue](../../issues/new?template=catalog-suggestion.yml) with the repository URL and the software it reimplements. The form automatically triggers link validation and available repository metadata checks. The bot posts or updates one CI-style findings comment with any warnings at the top, including a caution for unrecognized Git hosts. A Catalog Suggestion is not a published listing and must still be reviewed and added through a pull request.

## Project Requests

If you cannot find an eligible reimplementation of a specific software product, you may [open a Project Request issue](../../issues/new?template=project-request.yml) without providing any links. The automated reviewer checks the required fields and any optional URLs. This is a request for maintainer review, not an automatically published request.

You can also submit an approved, published Project Request through a pull request:

1. Read `POLICY.md` and search both `apps/frontend/remade-wiki/src/content/catalog/projects/` and `apps/frontend/remade-wiki/src/content/catalog/requests/`.
2. Ensure the target has an entry in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml` (add one in the PR if necessary).
3. Add `apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml` using `examples/request.yaml`. Explain the desired behavior or interface without copying protected code/assets. If the request or its details came from an issue, include its URL in a YAML comment above the record. Keep source issue comments on project and tool suggestions too.
4. Open a PR and check the `POLICY.md` acknowledgment. Maintainers can merge, request edits, or close it.
5. When a matching project gets indexed, requests for every target in its `originals` list should be deleted in the same PR. Multi-target projects use one listing with a required nonempty `originals` list; see [the catalog schema](docs/CATALOG.md).

Requests have no votes, bounty promises, or claim/assignment system. They are distinct from approved reimplementation listings.

## Add a supporting tool

Tools that add on to indexed projects are welcome under `apps/frontend/remade-wiki/src/content/catalog/tools/<github-user>/<slug>.yaml`. Read the supporting-tools section of `POLICY.md` and copy `docs/examples/catalog/tools/tool.yaml`. Link the source repository and tool, describe the added functionality, and reference existing project slugs in `projects`, suite slugs in `suites`, or both. A suite reference must accurately cover every member; keep extra supported projects explicit. See `docs/CATALOG.md` for the suite schema and copy `docs/examples/catalog/suites/suite.yaml` when adding a grouping. Disclose dependencies and licensing accurately. Tools are reviewed through the same PR flow and may be featured with a Tool label; they do not fulfill Project Requests.

Requests may also include optional `suggested_names`, such as `[MusicCraft]`. These are naming ideas, not existing implementations or reserved names. Choose names distinct from existing software brands, without implying affiliation; see the naming requirement in [POLICY.md](POLICY.md#5-submission-requirements).

## Credit authors

Projects and tools may include `authors: [github-handle]` directly in their YAML. Use lowercase GitHub user or organization handles; no separate author file is needed. Credit documented authors explicitly; repository ownership or dependency relationships do not establish authorship. Multiple authors are supported. These handles drive the static `/authors/<github-handle>` pages and **View More by Author** links without changing featured selections.

## Correct an entry

Open a pull request modifying the existing YAML. Explain the correction and link to supporting documentation if possible.

## Featured listings

Featured listings are an editorial selection curated by maintainers, not a field contributors need to set in their own submissions. To feature a project, a maintainer adds its `slug` to the ordered list in `apps/frontend/remade-wiki/src/content/catalog/featured.yaml` (the first slug is the primary Featured card). The catalog validator requires each slug to reference an existing project or supporting tool.

## Reporting legal concerns

See [Remade's disclaimer page](https://remade.wiki/disclaimer) for the legal contact and reporting process. Please do not post sensitive personal information in a public pull request.

## Automated checks

GitHub automatically validates submissions, verifies policy acknowledgment, and checks links when a pull request is opened or updated. No manual setup is required.

### Vendor references

When adding an original, look for its publisher or vendor brand in `apps/frontend/remade-wiki/src/content/catalog/vendors.yaml`. Set the original's optional `vendor` to that canonical slug, adding a `{slug, name}` vendor record if needed and supported by the software's publisher information. This keeps `/vendor/<slug>/` accurate after a request is fulfilled. Leave unknown ownership unassigned rather than deriving it from the reimplementation's author.
