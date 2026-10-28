# Draft site integration

This is an implementation record, not publication approval. Terms and Privacy remain drafts awaiting publication review. Public-facing copy no longer contains bracketed placeholders or editorial drafting instructions; unresolved operational decisions stay in this internal record. Both display Last Updated: October 27, 2026. That update date does not publish the drafts or establish an acceptance record. No account is treated as having accepted them.

## Implemented first pass

- `/terms/` and `/privacy/` render the canonical Markdown drafts in `apps/frontend/remade-wiki/src/content/legal/` during `pnpm dev`. These files were imported from the supplied local package under the git-ignored `docs/other/` directory. Edit the tracked website drafts from now on; the original package is reference material, not a competing publication source. Each preview has a compact development-only draft notice, table of contents, readable tables, print styles and `noindex` metadata. The print view retains its draft warning.
- `/legal-preview/` is also development-only. It links to both drafts and includes an unchecked agreement interaction preview. Continuation is disabled until checked. It creates no OAuth request, account change, agreement evidence or persistent browser-storage record.
- `src/lib/legal.ts` records both documents as drafts. Draft routes and footer links are omitted from production builds. A future change to published status must also supply explicit approval and a valid Last Updated date matching the Markdown header; unresolved fields or draft warnings fail route generation. No environment flag can publish the drafts.
- The footer uses the final site layout with branding, Explore/Community/Legal columns and a separate community/Replicraft credit row. Terms and Privacy occupy their ordinary Legal positions in development; there is no separate hidden preview navigation. Production omits only links to the unpublished documents until approved pages can be emitted. Contact links to the Disclaimer anchor, keeping the email on that page alone.
- The existing Disclaimer has a stable `#contact` target. Its qualified legal-precedent discussion is preserved. No contact email is added to the footer or other public pages.
- The external GitHub request-form link is preceded by a notice naming `replicraft/remade`, public issue text and links, GitHub identity attribution and the instruction to avoid private information. The on-site request form remains a development simulation.
- Draft account/privacy facts now describe both providers, verified private/secondary GitHub emails, Discord's verified email, private fingerprints, explicit account merging, session revocation and provider-preference storage. The Privacy Policy follows the plain-language numbered sections in the supplied `docs/other/PRIVACY.md` example, adapted to Remade rather than its billing, artist or client-data features. The account-free MVP in `docs/other/PLAN.md` is historical context; it does not remove shipped accounts or voting. Retention and operational decisions still require review before publication.

## Source evidence checked in this pass

- `apps/backend/remade-api/src/auth.rs`, `profile.rs`, `db.rs`, `config.rs` and `session.rs` establish the current auth data flow. Email alone never authenticates or automatically merges accounts. Explicit merging requires a live initiating session, fresh provider authentication and a matching verified email observation. Account IDs and activity remain private except for supported aggregates and caller-specific responses.
- `apps/frontend/remade-wiki/src/lib/auth-notifications.ts` uses temporary pending-attempt markers in session storage; `login-provider.ts` stores only the last successful provider name in local storage. No agreement evidence exists in either location.
- The development request form uses the `remade.project-request.v1` local draft format and a 24-hour validity check. Expiration checks are not proof that a browser record is physically purged at that time. The production request flow currently opens GitHub's own public issue form.
- The current schema has no agreement table. The Worker has no implemented account-deletion endpoint, privacy export/correction workflow or scheduled expired-session purge. Existing session expiration and logout must not be described as those features.
- There is no Launcher page or Launcher application in this checkout. Launcher UI and release behavior require work against the actual Launcher branch/repository and release-specific evidence.

These are source observations. They do not verify Cloudflare-injected analytics, logging, mailbox practices, backup retention, international processing or Launcher network behavior.

## Still required before publication

1. Complete the decisions in this record and the supplied package's `PUBLICATION_CHECKLIST.md`, confirm actual practices and any required operator/contact details, and complete the specified legal review. The absence of public placeholders is not publication approval. Do not replace unknowns with guesses.
2. Implement the real versioned agreement flow, with server-side recording and checks on relevant authenticated actions. Existing users must not receive invented historical agreement dates. The UI preview is not an enforcement mechanism.
3. Choose retention and deletion rules before implementing cleanup. Add forward-only migrations where needed, define account merge/deletion handling for future agreement evidence, and test locally. No new auth migration or production account change is included in this first pass.
4. Implement and verify the private account-data request workflow and actual session cleanup; inventory backups, support correspondence and Cloudflare settings. Do not publish promises about controls that do not exist.
5. Verify Launcher legal links, local notices, updater defaults and diagnostics in its own codebase. Do not guess from the website's source.
6. Promote only the approved text, archive the accepted versions and verify the production build and operator deployment. The tracked website source files remain drafts and cannot be published merely by turning on an environment variable.

## Review locally

Run `pnpm dev` and open:

- `http://localhost:4321/legal-preview/`
- `http://localhost:4321/terms/`
- `http://localhost:4321/privacy/`
- `http://localhost:4321/disclaimer/#contact`

The first three routes are absent from `pnpm build` output while the documents remain drafts. Core document reading does not require JavaScript. Only the optional agreement interaction preview is hydrated.

Unit coverage checks draft exclusion, metadata/source consistency, unresolved-field rejection and real package blockers. A focused React browser test covers the unchecked agreement preview and disabled continuation. Test execution remains subject to the repository's local-test policy.

## Verification for this first pass

Astro/TypeScript checks and the production static/Pagefind build passed. Read-only requests to the local development server returned 200 for all three previews and the Disclaimer, and confirmed draft warnings, contents navigation, current-provider disclosures, disabled continuation and the contact anchor. Inspection of production output found no draft routes, draft policy text, unresolved operator placeholder or draft footer links. New automated tests were added but not run locally. No production deployment, database migration or account operation was performed.

## Operator decisions incorporated

- Operator name: Replicraft. No assertion of an incorporated legal entity has been added.
- Governing law: the laws of the State of California. The operator-selected dispute clause requires a reasonable good-faith informal effort and selects state or federal courts in San Francisco County, California, except where applicable law provides otherwise. Mandatory consumer protections are preserved.
- Minimum account age: 13, retaining the draft's higher applicable law/provider age requirement.
- Public metadata: Last Updated: October 27, 2026, replacing Version and Effective date fields.

## Outstanding publication decisions

The supplied package identifies the following unresolved operator decisions; none have been filled with guessed values:

- Confirm any required operator/contact information for publication. The page identifies Replicraft and links to the existing private contact. No incorporation status or operator location is inferred. The dispute clause uses the operator-selected San Francisco County venue with its applicable-law exception.
- Publication approval. The public documents use Last Updated rather than separate Version/Effective date fields. Future server-side acceptance must still identify the exact approved text, for example by its document hash.
- Verify production analytics/advertising configuration, DNT/GPC handling, other browser storage and security cookies. The proposed no-sale/no-targeted-advertising rule is policy text awaiting approval; a source scan alone cannot verify hosting-injected scripts or external processors.
- Mail providers and any additional automated-review/reporting recipients.
- Account deletion, expired-session deletion, activity, agreement evidence, operational logs, correspondence and backup retention.
- International processing/transfer details.
- Launcher diagnostics/local-data behavior and optional credential persistence/removal.

The complete source package remains in `docs/other/remade-legal-documents/` as local reference material and is not required by the build.

## Writing reference and primary sources

`docs/other/PRIVACY.md` supplies the requested plain-language structure and short numbered sections. Its CommsOpen-specific claims and providers were not imported. `docs/other/PLAN.md` describes an earlier static MVP and does not override the subsequently shipped auth/request features or current repository specifications.

The California browser-signal wording was checked against the California Attorney General's [CCPA guidance](https://oag.ca.gov/privacy/ccpa). Provider links refer to their own notices: [Cloudflare](https://www.cloudflare.com/privacypolicy/), [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and [Discord](https://discord.com/privacy). These sources do not establish Remade's production settings or certify the completed policy.
