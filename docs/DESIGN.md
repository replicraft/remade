# Remade: UI and Brand Specification

## Tone

A modern reference library for developers: precise, understated, inviting. Inspired by the clarity and category-led discovery of privacytools.io, but **not** a visual copy. Avoid SaaS dashboard chrome, heavy gradients, artificial popularity claims, and over-designed cards.

## Identity

- Wordmark text: `remade.wiki` (prominent *remade*, lime `.wiki` accent permitted).
- Hero: **Everything can be remade.**
- Supporting copy: *Discover independently developed software reimplementations.*
- Icon: two overlapping squares; outline = first implementation, solid = second; small charcoal void at intersection.
- Favicons: `apps/frontend/remade-wiki/public/favicon.svg`, `apps/frontend/remade-wiki/public/favicon-16.png`, `apps/frontend/remade-wiki/public/favicon-32.png`, `apps/frontend/remade-wiki/public/apple-touch-icon.png`; a 512px visual reference at `assets/branding/favicon-preview.png`.

## Colors

| Role | Hex | Usage |
|---|---|---|
| Canvas charcoal | `#15191F` | Main page and favicon background |
| Deeper background | `#111419` | Section contrast |
| Elevated surface | `#232B34` | Cards and menus |
| Panel border | `#3A444F` | Hairlines and cards |
| Lime | `#C4F477` | Accent, active controls, highlighted links |
| Main text | `#F7F9FA` | Headings and body |
| Muted text | `#B2BEC9` | Secondary descriptions |

Implement focus and hover states, ensure accessible contrast, and make the interface usable without relying on color alone. Reserve lime for interactive emphasis and the icon.

## UI implementation

Use React components for the UI and Tailwind utility classes for layout, spacing, typography, responsive behavior, and component states. Keep global CSS to theme tokens and base defaults. Astro owns static routes and document metadata. Hydrate React only for browser interactions; static React components do not send a React runtime to visitors. Format source with Biome.

Authentication sits at the far right of the header: a compact **Login** link when signed out, or an initial-based dropdown with the account name and **Logout** when signed in. Hydrate only this small island; anonymous browsing makes no auth API calls. Keep the account dropdown in `UserDropdown`: an uppercase account initial in a circle and a chevron trigger, a separated identity section with display name and GitHub handle, and a Logout button with a Lucide icon. Use `react-dropdown` for open state, outside-click dismissal, Escape and keyboard navigation; customize its trigger, group heading and Logout option. Preserve keyboard focus and mobile wrapping. See `AUTH.md` for the authentication boundary.

### Source readability

- Separate logical blocks with a blank line: imports and declarations, setup and assertions, independent test cases, control-flow blocks and returns. Keep related statements together rather than compressing an entire component or test into uninterrupted lines.
- Keep each Astro/HTML opening and closing tag intact. Never move `>` onto the next line before a child (such as `><div`) or split a closing tag into `</Layout` and `>` on different lines. For multiline attributes, put the closing `>` on its own line and start children on the following line.
- Use Biome's HTML `whitespaceSensitivity: "ignore"` to avoid whitespace-preserving bracket contortions. Preserve intentional inline text spacing explicitly and review rendered output when reformatting markup.
- Formatting commits must be separate from behavior, schema and catalog changes. Apply these conventions throughout app source and tests; Biome preserves blank lines but does not decide where logical separation is needed.

## Typography and layout

- Use a clean modern sans-serif, preferably system font initially; if a webfont is added, self-host and subset it.
- Clear hierarchy, generous vertical whitespace, modest rounded corners (8–16px), subtle shadows.
- Max content width approximately 1100–1200px; reading sections narrower.
- Responsive project cards: 1 column small screens, 2 on tablets, 3 on desktop.
- Usable down to 320px width; cards should not truncate vital project names.
- Keep card rows equal in height, allowing enough room for six description lines when needed even when headings or author links wrap. Bound the description preview to six lines plus room for its link so long text cannot expand automatically sized grid rows. Show descriptions in full when they fit the preview boundary; truncate overflowing descriptions and show a subtle “Read more…” link only when there is more text. Preserve full project names and keep author links or suggested names at the bottom.

## Home page sections (ordered)

1. Header: logo, Explore, GitHub, Submit.
2. Hero: `Everything can be remade.` and one supporting sentence.
3. Compact dark search field with a magnifying glass and bordered keyboard shortcut badge. On the homepage, show **Hit enter to search** in a dropdown beneath the field only when it contains text and the search form has focus. Style the hint like a search-result row, associate it with the input for screen readers, and allow clicking it or pressing Enter to open Explore with the query. The dropdown overlays the page without moving the content below it.
4. **Featured**: one large editorial highlight plus smaller selected cards on desktop. On mobile, show equal-size cards stacked in featured order, with the first entry on top. If fewer entries exist, adapt gracefully instead of duplicating content. Supporting tools may be featured with a visible **Tool** label and remain separate from reimplementation counts.
5. Browse by category: clear icon labels, counts when known.
6. Recently added: reviewed latest additions; no invented dates.
7. **Project Requests**: place **“Step up to the plate?”** in smaller text after the introductory description; unfulfilled targets, concise contextual descriptions, link to requests index and PR contribution instructions. Show an intentional empty state when no requests exist.
8. Footer: brand/tagline + GitHub, Submit, **About**, and **Disclaimer** links.

## About page

- `/about` presents Remade's story, mission, engineering philosophy, and community contribution links in well-spaced editorial sections, with narrow reading columns.
- Lead with **Everything can be remade.** and preserve **“An implementation is one way to solve a problem, not necessarily the only way.”**
- Celebrate independent engineering, interoperability and preservation without framing the directory as hostile to proprietary software or implying Remade builds the listed projects. Credit their developers and communities.
- Provide secondary navigation to the GitHub repository, contribution guidelines, Project Requests, Badges and Disclaimer. External resource links open in new tabs.
- Render statically without React hydration; include the page in the sitemap and Pagefind index.

### Listed on Remade badges

- The dark and light SVG badges are 127 × 20; the single Classic variant at `/badges/listed-on-remade-classic.svg` is 115 × 20. Preserve the SVG assets unchanged and use their native dimensions in HTML snippets. `/about/badges` previews all three variants and documents badge usage.
- Individual project and tool detail pages include a Share this project or Share this tool section, a dark badge preview and an About Remade badges link beside the heading and beneath the controls. Reuse `BadgeShareSection` for the static layout. Hydrate only `CopyBadgeDropdown` for the split Copy Markdown button and `react-dropdown` commands: HTML, BBCode, separator, light Markdown, HTML and BBCode, then another separator and Classic Markdown, HTML and BBCode. The primary button always copies dark Markdown. Keep the trigger unchanged after selecting a command.
- Generate snippets from the page's canonical URL, escape HTML attributes, announce clipboard success or failure, and offer a selectable snippet if copying fails. Support keyboard navigation, Escape dismissal and visible focus.
- Badges indicate a directory listing, not an audit, certification or endorsement. Link project badges to their canonical `/projects/...` URL and tool badges to their canonical `/tools/...` URL. Do not add sharing controls to cards, software pages or requests.

## Project Requests page

- Order homepage requests alphabetically by the original software's display name. The requests index defaults to newest first by catalog addition dates in Git; unknown dates come last and ties use the original slug.
- Heading: **Project Requests**
- Explain that these are community wishes, *not active or approved implementation projects*.
- Cards show target, category, description of what should be reproduced, and reference link.
- Primary CTAs: **Submit a request** (PR instructions) and **Know a project? Add it** (PR instructions).
- No fake contributor counts, fake votes, claimed assignments, or implied permission from original owners.
- When a qualifying implementation is merged, remove the associated request entry (validated in CI).

## Explore page

- Search across original software name, project name, description, languages.
- Compact category, language, and platform filters beneath the search field; expandable additional filters for compatibility and development status. Filters apply immediately. Keep sorting beside the result count.
- Sorting: recent, alphabetical, stars. `stars: null` sorts after known counts.
- Cards expose original → implementation relationship at a glance.
- Tool cards use the same badge layout as projects, with Tool first, followed by documented Status, Language and Stars when available. Do not add category badges to entry cards.
- Empty state proposes clearing filters or contributing a new project.
- When a nonempty search has no matching entries, show matching Project Request cards and a link to the requests search. Match names, aliases, suggested names, vendors and requested features, prioritizing title matches. Project-specific filters do not restrict this fallback; clearly label requests as wishes rather than existing implementations.
- Use local data and Pagefind index (no hosted query endpoint).

## Project detail page

- Project title and original-software link.
- Neutral statement of compatibility aims; clearly mark *maintainer-reported* information.
- Primary repository CTA and optional docs link, language/license/category/status tags.
- Show an Official website button beside the repository CTA when a project supplies a documented website; open that link in a new tab.
- Show a Repository Mirrors header below the primary links. When mirrors exist, show a collapsed View Mirrors accordion with bordered links identifying each mirror by host and repository path and opening in new tabs. When none are listed, display “No mirrors found” and a contribution link directly beneath the header, without an accordion. Metadata continues to come from the primary repository.
- GitHub stats (stars, forks, last push and archive status when available).
- Small note: **GitHub statistics are refreshed approximately every 24 hours.**
- Focus/hover timestamp from `fetchedAt` when present; if absent, state `Statistics currently unavailable` instead of implying freshness.
- Known limitations; related implementations of the same original.

## Original-software page

- Original name and official/reliable reference URL.
- Brief factual synopsis, original software category.
- All approved reimplementations targeting that original.
- When there are multiple reimplementations, show a prominent Compare button beside the listing heading. Expand a static side-by-side table of languages, platforms, maintainer-reported compatibility and maturity, license, scope, limitations and cached development activity. Show missing activity as unavailable, include cache freshness, and allow keyboard-accessible horizontal scrolling on small screens. Comparison works without JavaScript.
- Never display a logo or mark in a way that implies an official partnership.

## Accessibility

- Skip-to-content link; proper h1–h3 outline; semantic card links.
- Visible keyboard focus in lime with sufficient contrast.
- Accessible search input labels and live region for filter result counts.
- Reduced-motion support; meaningful icon labels or `aria-hidden` for decoration.
- Decorative branding icon may be empty-alt alongside explicit wordmark.
- Keep each author handle and arrow together on one line; move the complete handle to the next line when needed.
- Disclaimer citations use numbered references and a Sources section; external source links open in a new tab.

## Suite browsing

Tool cards and tool pages show a clickable suite name, such as ArtCraft Suite, instead of listing every member. Additional supported projects remain visible individually. `/suites/<slug>/` renders a static page with the suite name, description, responsive member project cards in curated order, and supporting tools that reference the suite. Use the existing card styles and grid breakpoints; suite links must remain keyboard accessible and work without JavaScript. Project cards show “Part of” followed by a link to each suite they belong to, using its recorded display name. Suite pages are included in Pagefind and the sitemap.

## Discord community links

Project detail pages and request sections on software pages show optional Discord server/thread links with the Discord logo and visible text labels. Cards link to their detail pages and omit Discord links. Use the existing lime link styling, keep icon shapes decorative for screen readers, and keep links above stretched card targets so pointer and keyboard navigation reach the intended destination. Omitted links render no controls. These are static links, with no Discord embeds or scripts.

## Refined Directory candidate

The draft Refined Directory implementation prioritizes Request a project, compact previews and static paginated browsing. Project/request classification, full detail content, suite/community links, badges and existing support semantics remain intact. See [the candidate report](experiments/refined-directory/README.md) for route changes, local form simulation, verification and production limitations. The on-site submission flow is development-only until a shared verified submission service is ready; production links to the existing GitHub Project Request form.

Card titles use a stretched link to make the card surface clickable. Author, original-software, suite and tool links, plus vote/builder controls, remain independently operable above that surface. Cards place original-software and suite/tool relationships above the description, show authors inline without separator dots, and omit a separate View project/request/tool footer action. Directory previews size from their content rather than stretched grid height; the leading featured card keeps its two-row desktop layout.
