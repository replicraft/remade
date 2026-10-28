# Legal pages and account-agreement integration

The maintainer approved publication of the Terms of Service and Privacy Policy on October 27, 2026. Both documents display Last Updated: October 27, 2026. Publication of these pages does not create agreement records for existing accounts or enable an account-agreement enforcement flow.

## Public pages and navigation

- `/terms/` and `/privacy/` render the canonical Markdown in `apps/frontend/remade-wiki/src/content/legal/`. They are included in production builds, the sitemap and Pagefind, and are readable without JavaScript or login. They have contents navigation, print styles and no draft warnings or noindex metadata.
- The footer includes Terms, Privacy, Disclaimer and Contact in its Legal column. The contact link uses `/disclaimer/#contact`; the email remains on that page alone. The footer also has Explore/Community columns and the By Replicraft organization link.
- `src/lib/legal.ts` records the two documents as published and operator-approved. Route generation validates the Last Updated header and rejects unresolved placeholders, draft warnings or missing approval. A future document explicitly marked draft stays excluded from production. No environment flag controls publication.
- The external GitHub submission notice names `replicraft/remade` and explains the public issue text, links and GitHub attribution before opening GitHub's form.

## Separate agreement preview

`/legal-preview/` remains development-only. Its unchecked checkbox and continuation are an interaction preview, not an acceptance mechanism. The preview makes no OAuth request and stores no agreement, account change or persistent browser-storage record. Ordinary authentication is unchanged.

A real account-agreement flow remains follow-up work. It must identify the exact accepted text, record server-side acceptance and enforce the appropriate authenticated actions. It must not invent acceptance dates for existing users. No backend migration is part of the page-publication change.

## Operator decisions incorporated

- Operator name in the introductory text: Replicraft. No incorporation status or operator location is inferred.
- Governing law: the State of California, without regard to conflict-of-laws principles, preserving mandatory consumer protections.
- Disputes: reasonable good-faith informal efforts, followed by state or federal courts in San Francisco County except where applicable law provides otherwise.
- Minimum account age: 13, retaining higher applicable law/provider requirements.
- Public document metadata: Last Updated, with no separate Version or Effective date fields.

## Current behavior described

The documents describe GitHub and Discord authentication, verified private/secondary GitHub emails, Discord's verified email, private email fingerprints, explicit account linking/merging and request voting/building activity. Provider tokens and raw emails are not persisted as account credentials. Session credentials are hashed. The browser stores temporary notification markers and a last-used provider preference, not agreement evidence.

The current Worker has no account-deletion endpoint, privacy export/correction workflow or scheduled expired-session purge. Session expiration and logout must not be described as those features. Account-data requests use the private contact; operational procedures and cleanup remain follow-up work.

The development request form uses a 24-hour local-draft validity check. The production request page currently opens GitHub's public issue form. A validity check is not proof of physical deletion at a specific time.

## Operational follow-up

These items remain implementation or verification work, rather than draft-publication gates:

- Implement and verify the private access/export/correction/deletion procedure and approved retention/cleanup practices, including backups, logs and correspondence.
- Implement server-side agreement evidence and decide how it behaves during account merges and deletion. Use forward-only migrations and local fixtures.
- Verify production analytics injection, DNT/GPC behavior, security cookies and external processors. A source scan alone does not establish hosting settings.
- Verify international-processing details, provider arrangements and any required operator/contact information.
- Verify Launcher legal links, updater defaults, diagnostic behavior and credential persistence against its actual repository and releases. No Launcher page or application exists in this checkout.

No production account operation or database migration has been performed as part of this integration.

## Writing references

The supplied `docs/other/PRIVACY.md` provided the requested plain-language structure. CommsOpen-specific billing, artist, organization and client-data claims were not imported. `docs/other/PLAN.md` describes the earlier account-free MVP and does not remove subsequently shipped account and request features.

The original package in `docs/other/remade-legal-documents/` remains local reference material. It is git-ignored and is not required for builds; edit the tracked website text instead.

Browser-signal wording was checked against the California Attorney General's [CCPA guidance](https://oag.ca.gov/privacy/ccpa). Provider links use their own notices: [Cloudflare](https://www.cloudflare.com/privacypolicy/), [GitHub](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and [Discord](https://discord.com/privacy). This source review does not verify Remade's production settings.

## Verification

Unit coverage checks approval, Last Updated/source consistency, placeholder rejection, draft exclusion and the real published documents. E2E coverage checks public pages and footer links without JavaScript while excluding the development-only agreement preview. The React preview test confirms that its checkbox starts unchecked and does not record an actual agreement. Local test execution remains subject to the repository policy.
