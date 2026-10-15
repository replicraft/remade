# Remade Submission Policy

> Everything can be remade.

Remade is a community-curated directory of independently developed software reimplementations and tools that add on to indexed projects. The directory links to third-party projects; it does not host or certify them.

This document describes **which projects qualify for listing**, **what submitters must provide**, and **how maintainers review submissions**. For general legal information and the reporting contact, see [the disclaimer](https://remade.wiki/disclaimer).

## 1. Eligible projects

A submission must meet **all** of these conditions:

1. **Identifiable original.** It targets a specific, existing software product or a well-defined software interface, protocol, or subsystem. The original must be identifiable by name and a credible reference URL.
2. **Independent implementation.** Its implementation is independently authored and must not incorporate leaked, stolen, or otherwise unauthorized source code, binaries, or copyrighted assets from the original.
3. **Faithful reimplementation goal.** It aims to reproduce the original's observable behavior, compatibility, interface, file formats, or other specified functionality. Exact compatibility is a **goal**, not a requirement that every feature already be finished. Broader alternatives may be included **with maintainer approval**, provided they meet the other eligibility requirements and accurately describe their scope and limitations.
4. **Public source and licensing.** The submitted repository is publicly accessible and normally under an identifiable open-source license. Maintainers may also accept publicly visible projects without a license, recorded exactly as `license: Unlicensed`; these are not represented as open-source software or as granting reuse rights. Implemented projects must contain substantive source. Early projects with only research, plans or scaffolding may be listed with `status: planned`, a specific compatibility target and a description that clearly distinguishes planned work from implemented features.
5. **Current catalog scope.** For now, Remade focuses on reimplementations of software whose original implementation is **not released as open-source software**. A separate rewrite of an already-open-source application does not currently qualify.
6. **Honest documentation.** The repository must describe its scope and limitations accurately. Projects must not claim complete compatibility or a verified clean-room process without adequate support.

Work-in-progress projects are welcome, including planned projects clearly labeled **Planned**. That status does not establish working software. Undocumented maturity alone does not justify the Planned status; review the repository's actual state. The directory may display self-reported project status and compatibility claims as such; publication is not an independent verification.

## 2. Projects not accepted

Remade does not accept the following as reimplementation listings:

- Forks, ports, or direct modifications of the original software's source code.
- Wrappers, launchers, skins, mods, or patches that depend on the original implementation as their core engine.
- General alternatives, lookalike interfaces, or products only inspired by the original, without a meaningful behavioral or compatibility objective, unless accepted **with maintainer approval**.
- Repositories primarily redistributing unauthorized original source code, binaries, firmware, game assets, or other copyrighted material.
- Projects whose main purpose is distributing cracks, pirated copies, or tools for unauthorized access.
- Empty repositories without a documented target or plan, deceptive listings, or duplicates of an existing listing. Research, plans and scaffolding must use the Planned status until meaningful implementation exists.

**Emulators, compatibility layers, and protocol implementations** are reviewed case by case. They qualify only when they genuinely implement a defined target and meet the independent-development requirements above.

### Supporting tools

Remade also accepts tools that add functionality to one or more indexed projects, including browser launchers, integrations, extensions and workflow helpers. Publish these separately under `apps/frontend/remade-wiki/src/content/catalog/tools/`, with links to the source repository and tool, a factual description, and references to the indexed projects they extend. A tool does not need to reimplement an original itself. It must have substantive, publicly accessible source and accurately describe its dependencies and licensing; do not infer an open-source license when none is stated.

Tools may be featured with a clear **Tool** label, but do not count as reimplementations or fulfill Project Requests. They follow the same PR review, link checks, correction process and prohibition on unauthorized original code or assets. This does not expand the directory to unrelated alternatives.

Using an independently licensed codebase other than the target as a foundation does not itself disqualify a reimplementation. Disclose that ancestry and the compatibility limits.

## 3. Clean-room and legal claims

Clean-room development is a methodology, not a legal certification automatically granted by inclusion in Remade. A project may describe itself as clean-room only where the claim is supportable. At minimum, submitted projects must represent that they were independently developed without unauthorized copying of protected source code or assets.

Reverse engineering and compatibility can raise different legal issues depending on jurisdiction and circumstances. Remade does not independently audit code provenance or determine whether any listed project is lawful. Contributors remain responsible for the accuracy of their submissions, and rights holders may report concerns through [the disclaimer page](https://remade.wiki/disclaimer).

## 4. Project Requests

Remade also accepts **requests for software that people would like to see independently reimplemented**. These appear under **Project Requests** and must not imply that a project already exists.

You may suggest a request through the Project Request GitHub Issue Form without providing links. To add an approved request to the public catalog, submit a pull request adding `apps/frontend/remade-wiki/src/content/catalog/requests/<vendor>/<original-slug>.yaml` and, if needed, a canonical original entry in `apps/frontend/remade-wiki/src/content/catalog/originals.yaml`. Requests must identify a specific existing software target, cite a reliable reference, and explain which behavior or interface a faithful implementation should reproduce. Search existing directory entries first; **requests are only for originals with no currently indexed qualifying project**.

Requests are not assignments, endorsements, authorizations from rights holders, solicitations to copy protected code, or promises that Remade will build the software. Signed-in visitors may upvote a request or indicate “I’m building this”; these reversible counters express self-reported interest and do not verify work, reserve names or grant publishing rights. A real implementation still follows the normal catalog review and PR process. The independent-development and no-unauthorized-assets standards still apply to any eventual implementation. Maintainers may decline vague, redundant, misleading, or unsuitable requests. When a matching implementation is accepted, the request entry is removed.

## 5. Submission requirements

**Suggested names must be distinct from existing brands.** Naming ideas for requested implementations must not be confusingly similar to the original software's brand or another existing software brand, or imply affiliation, endorsement, or an official successor. Do not reuse a brand name, use a close spelling variant, or simply append “Craft” to it. Choose an independently recognizable name. This is an editorial requirement, not trademark clearance or a guarantee of legal availability.

Contributions should be made by pull request, adding **one project file per project** under `apps/frontend/remade-wiki/src/content/catalog/projects/`.

Each submission must include:

- Project name and publicly accessible source repository URL.
- Original software name and an official or otherwise reliable reference URL.
- A neutral, concise description of what functionality is being reimplemented.
- Category, primary programming language(s), and development status.
- Stated compatibility scope and known limitations, where documented.
- Open-source license identifier or a link to the project's license file; for a maintainer-approved project with no license grant, use `Unlicensed`. This is distinct from `Unlicense`, which is a permissive public-domain dedication.

The project URL must link to the actual implementation, not merely a marketing page. Links must be relevant and functional. Avoid unsubstantiated superlatives and promotional claims.

**Do not add `featured` to your own project entry.** Featured selections are maintained separately by Remade's maintainers.

Keep published `/projects/<slug>/` URLs stable when changing a project's display name or author folder. If a project slug must change, the same pull request must add a temporary redirect from the old URL to the new URL so existing links continue to work. Keep earlier renamed URLs pointing directly to the current page, avoid redirect chains and loops, and do not reuse an old slug for a different project. Maintainers may explicitly approve exceptions to these URL stability requirements, including omitting or removing a redirect.

## 6. Review and moderation

Submitting a pull request does not guarantee publication. Maintainers may request corrections, reject, close, hide, or remove entries at their discretion, including for eligibility concerns, misleading information, legal complaints, or directory quality. Decisions are editorial and do not represent legal findings.

If an entry becomes inaccurate, its source repository disappears, or a rights concern arises, maintainers may update or delist it. Historical and archived projects may remain listed when their records are useful and accurate.

## 7. Contributor acknowledgment

By submitting a pull request, you affirm **to the best of your knowledge** that the information supplied is accurate, the project meets the eligibility criteria above, and you will comply with this policy. The pull request template includes a corresponding acknowledgment checkbox.

This policy may change as the directory evolves. Material scope changes should be documented in the repository history.
