# Public Homepage V3 Worklog

## Purpose

This file is the active checkpoint log for the Public Homepage V3 initiative.

Use it to:

- record what has been decided
- record what was completed
- record the next exact step
- resume safely after interruption

## Current Status

- Initiative state: `implementation`
- Analysis doc: `docs/public-homepage-v3-analysis.md`
- Execution role: `docs/public-homepage-v3-execution-role.md`
- Master task list: `docs/public-homepage-v3-master-task-list.md`
- Last updated by: `Codex`

## Frozen Decisions

- the working target is the public homepage shown to unauthenticated users on `/`
- the current homepage entry point is `frontend/src/pages/PublicLandingPageV3.jsx`
- work must proceed task by task in the order tracked by the master task list
- every significant implementation step must be logged here before and after code changes
- this file is the interruption recovery source for this initiative

## Open Assumptions

- current homepage metrics and trust surfaces are marketing/demo data unless later confirmed otherwise
- current WhatsApp number and several footer/social links are placeholders
- credibility and maintainability take priority over cosmetic redesign in the first execution phase

## Implementation Queue Snapshot

- `HP-001` Create homepage execution control files: `completed`
- `HP-002` Extract homepage links and public actions into clear constants: `completed`
- `HP-003` Identify and replace high-risk placeholders: `completed`
- `HP-004` Move homepage marketing content into a cleaner maintainable structure: `completed`
- `HP-005` Review and harden trust and credibility surfaces: `completed`
- `HP-006` Refine Hero messaging and CTA hierarchy: `completed`
- `HP-007` Refine Pricing and FAQ for production use: `completed`
- `HP-008` Review homepage accessibility and interaction integrity: `completed`
- `HP-009` Review homepage performance and unnecessary UI weight: `in_progress`
- `HP-010` Add tracking hooks for primary conversion actions: `pending`
- `HP-011` Final homepage QA pass and production readiness review: `pending`

## Activity Log

### 2026-03-30

- Started the homepage execution-control setup based on the completed homepage analysis.
- Reviewed existing docs conventions and confirmed that this initiative needs dedicated control files similar to the repo's larger tracked workstreams.
- Created the execution role file to define the working contract, engineering standards, interruption-recovery rules, and task completion rules for this homepage track.
- Created the master task list to make homepage execution sequential, explicit, and recoverable.
- Created this dedicated worklog as the official checkpoint and restart source for the homepage initiative.
- Started `HP-002`.
- Inventoried current homepage public actions and found scattered hardcoded login/register links, repeated WhatsApp URLs, pricing-plan registration routes, and footer/social placeholder links spread across `Nav`, `Hero`, `Pricing`, `FAQCTA`, `TrustHighlights`, and `Footer`.
- Implementation intent for `HP-002`: create one shared homepage public-links/constants source, wire the homepage V3 components to it, and keep unresolved placeholder destinations explicitly centralized for the next placeholder-removal task.
- Completed `HP-002`.
- Added `frontend/src/lib/payqusta-v3/public-links.js` as the shared source for homepage authentication actions, WhatsApp contact action, plan-registration routing, and footer/social destinations.
- Rewired `Nav`, `Hero`, `Pricing`, `FAQCTA`, `TrustHighlights`, and `Footer` to consume the shared links source instead of scattered hardcoded URLs.
- Centralized unresolved footer/social placeholders in one file so the next task can replace them without hunting through component code.
- Kept behavior stable on purpose: this step reorganized destination ownership, but did not yet claim new production links where the current product decision is still unknown.
- Started `HP-003`.
- Safe-replacement plan for this step: remove dead-end footer/social placeholder behavior, replace remote demo CTA avatars with local deterministic UI, and avoid inventing unsupported public destinations for pages or channels that do not exist yet.
- Completed the safe portion of `HP-003`.
- Replaced dead-end footer placeholders by mapping only to real public routes that already exist and suppressing unsupported footer destinations instead of exposing `#` links.
- Replaced unsupported social placeholders by rendering only channels with an actual destination from the shared links file instead of showing dead social icons.
- Replaced remote CTA demo avatars with local deterministic initials-based UI so the homepage no longer depends on external demo imagery for social proof.
- Completed `HP-003` by replacing the unresolved contact placeholder with the existing public `/contact` route as the safe production fallback.
- Aligned the floating contact action and sales-contact CTAs with `/contact` so the homepage no longer implies a real WhatsApp destination that is not confirmed.
- Started `HP-004`.
- Maintainability plan for `HP-004`: move repeated homepage UI/config data out of component bodies into a shared config file so later content and layout changes require fewer scattered edits.
- Added `frontend/src/lib/payqusta-v3/homepage-config.js` as the first shared config source for repeated homepage section targets, trust-strip companies, hero ticker brands, and CTA proof avatars.
- Moved repeated section-target configuration out of `Nav.jsx` into the shared config file and kept the icon rendering local to the component.
- Moved trust-strip company names out of `TrustHighlights.jsx` into the shared config file as the first non-translated section-data cleanup step.
- `HP-004` is in progress: the same cleanup still needs to continue for the remaining repeated homepage constants in `Hero.jsx` and `FAQCTA.jsx`.
- Started the next `HP-004` slice to finish the remaining repeated-config extraction from `Hero.jsx` and `FAQCTA.jsx`.
- Rewrote `FAQCTA.jsx` cleanly and moved the CTA proof-avatar configuration to `homepage-config.js`, removing one more repeated data block from component-local code.
- Completed `HP-004`.
- Rewrote `Hero.jsx` cleanly and moved the hero ticker-brand list into `frontend/src/lib/payqusta-v3/homepage-config.js`, closing the last repeated-config extraction in the homepage V3 slice.
- `HP-004` outcome: homepage navigation targets, trust-strip items, hero ticker brands, and CTA avatar config now live in shared maintainable config instead of scattered component-local arrays.
- Started `HP-005`.
- Credibility-hardening review found that the homepage still presents several trust surfaces as if they were validated production claims: partner/integration strip wording, testimonials styling, report values, metrics framing, hero stat strip, and CTA social-proof copy.
- Implementation intent for the first `HP-005` slice: keep the current visual direction, but soften or relabel unverified claims so a first-time visitor does not read illustrative content as audited live proof.
- Completed the first `HP-005` slice.
- Added `homepageCredibilityCopy` in `frontend/src/lib/payqusta-v3/homepage-config.js` as the shared source for credibility-facing labels and disclaimers used across the homepage.
- Reworked the trust strip to describe illustrative commerce workflow coverage instead of showing a public-facing partner roster that could be read as confirmed live integrations.
- Softened the hero top badge from a specific-integration announcement to a generic operations message and added an explicit note above the hero stat strip that those figures are illustrative.
- Added explicit illustrative labeling to the reports and metrics sections so the charts and numbers no longer read as live audited public proof.
- Reframed testimonials as illustrative scenarios rather than verified star-rated customer reviews and removed direct person-name presentation from the testimonial footer.
- Replaced the CTA social-proof claim with a safer direct-contact cue so the end-of-page conversion block no longer depends on an unverified merchant-count statement.
- Continued `HP-005` with a second-pass audit inside `frontend/src/lib/payqusta-v3/i18n-content.js`.
- Softened high-risk copy that was still visible to first-time visitors, including free-trial promises, support-channel promises, explicit certification language, unverified testimonial growth outcomes, and CTA copy that implied confirmed social proof.
- Reframed visible homepage copy toward clearer positioning and safer operational language without changing the current route structure or layout.
- Completed `HP-005`.
- `HP-005` outcome: the homepage trust surfaces now either use explicit illustrative framing or avoid the strongest unverified public claims that previously read as confirmed facts.
- Started `HP-006`.
- Initial `HP-006` direction: refine the hero so the first screen states value, audience, and next action more directly now that the credibility pass has removed the heavier placeholder marketing claims.
- Completed the first `HP-006` slice.
- Added `homepageHeroMessaging` in `frontend/src/lib/payqusta-v3/homepage-config.js` so hero-specific messaging can now evolve independently from the broader i18n content file.
- Tightened the hero headline around direct operational value instead of generic marketing verbs.
- Updated the hero subheadline to name the intended audiences more explicitly: retail, online selling, and multi-branch operations.
- Added visible audience chips in the hero so a first-time visitor can identify fit quickly before scrolling.
- Reframed the secondary hero CTA to match its actual behavior by presenting it as platform exploration rather than a pseudo-demo action.
- `HP-006` remains in progress because the next slice still needs to validate whether the primary CTA destination and the supporting hero stat strip are the best first-screen hierarchy after the copy rewrite.
- Audited the homepage pricing section and color system status on 2026-03-31 based on the active homepage files.
- Pricing status: the pricing UI is render-dynamic at the component level because `Pricing.jsx` maps over `t.pricing.plans` and switches monthly/yearly with local state, but the plan data itself is still static content sourced from `frontend/src/lib/payqusta-v3/i18n-content.js`, not from an API, CMS, or dedicated runtime config.
- Pricing conclusion: the homepage pricing section is not fully dynamic yet; it is currently a static-content-driven dynamic renderer. Making pricing truly dynamic still belongs to the upcoming `HP-007` scope.
- Color-system audit: the homepage V3 runs on a dedicated token layer in `frontend/src/index.css` using `--bg`, `--bg2`, `--bg3`, `--surface`, `--border`, `--text`, plus gold `#C8A84B` and teal `#2ECC8F` as the primary accent pair.
- Homepage dark palette in active use: `--bg #0D1B2A`, `--bg2 #162336`, `--bg3 #1A2B3C`, `--surface #1E3248`, `--text #FFFFFF`, `--text2 #8BA3BC`, `--text3 #4E6880`, accent gold `#C8A84B`, accent teal `#2ECC8F`.
- Homepage light palette in active use: `--bg #F0F4F9`, `--bg2 #FFFFFF`, `--bg3 #E8EFF7`, `--surface #FFFFFF`, `--text #0D1B2A`, `--text2 #4E6880`, `--text3 #8BA3BC`, while the same gold/teal accents continue to drive CTAs and emphasis.
- System-token audit: the repo still also contains an older general token layer in `frontend/src/index.css` (`--c-*`, `--app-*`, `--accent-*`) alongside the homepage V3 token layer, which means the color system is functional but not yet fully unified.
- Color conclusion: the homepage colors themselves are consistent, but the broader design system still has token duplication between the generic app layer and the V3 homepage layer; this should be treated as a follow-up maintainability/design-system concern rather than a blocker for the current homepage track.
- Design review note on 2026-03-31: the current homepage gold accent `#C8A84B` is internally consistent inside V3, but it feels somewhat detached from the broader product color language where navy/teal carry most of the system identity. This is not a functional bug, but it is a reasonable brand-alignment concern and should be treated as a visual-system decision before final polish.
- Dashboard-palette alignment request accepted on 2026-03-31 for the homepage track.
- Implemented the first homepage palette-alignment pass by moving the main V3 accent behavior away from gold and toward the dashboard palette: primary action emphasis now follows dashboard teal and secondary emphasis follows the dashboard indigo accent.
- Updated the shared color sources in `frontend/tailwind.config.js` and `frontend/src/index.css` so homepage accent classes now resolve closer to the dashboard palette instead of the previous gold-heavy treatment.
- Updated several high-visibility homepage surfaces to follow the new palette direction, including nav progress, hero gradients, report chart colors, POS icon treatment, footer brand mark, and the floating contact button.
- Remaining color-alignment work is still intentionally tracked inside the remaining homepage tasks because several sections still contain explicit accent choices that should be cleaned up section by section rather than via a risky bulk rewrite.
- Closed `HP-006` after reviewing the current `Hero.jsx` hierarchy against the updated dashboard-aligned palette: the first screen now states the audience, value, and next action clearly enough without relying on the older placeholder-heavy trust language.
- Started `HP-007`.
- Implementation intent for the first `HP-007` slice: make homepage pricing safer for production use by preferring active plans from `/plans` when available, keeping a structured fallback when no public plans are published yet, replacing the remaining old inline accent colors in pricing, and tightening the end-of-page CTA badge language so it does not imply an unconfirmed free-start promise.
- Completed the first `HP-007` slice.
- Rebuilt `frontend/src/components/payqusta-v3/Pricing.jsx` so the homepage now prefers active public plans from `/plans` instead of relying only on `t.pricing.plans`, while still keeping a structured localized fallback path if no public plans are available yet.
- Switched homepage pricing CTA routing from localized plan names to stable plan IDs when live plans exist, so signup can carry a real plan reference that the login/subscription flow already understands.
- Added `homepagePricingContent` and `homepageFinalCtaMessaging` in `frontend/src/lib/payqusta-v3/homepage-config.js` to centralize fallback plans, fit-for-business-size labels, live/fallback pricing notes, and safer final CTA badge copy.
- Replaced the remaining old inline green/gold pricing accents with the dashboard-aligned accent classes and updated the popular-card emphasis to the new teal-led hierarchy.
- Tightened the final CTA badge in `FAQCTA.jsx` so it no longer claims an unconfirmed free-start offer and now uses the centralized safer wording.
- Pricing status changed on 2026-03-31: the homepage pricing section is now API-aware with a safe fallback path. It is no longer only a static-content-driven renderer, even though the fallback catalog still exists for resilience when no public plans are published yet.
- User requirement update on 2026-03-31: the public homepage pricing must show only the plans created by the admin inside the product. Local fallback plans are no longer acceptable for this section because they can drift away from the real commercial setup.
- Implementation intent for the next `HP-007` slice: remove the homepage pricing fallback catalog entirely, keep `/plans` as the single source of truth, and replace the fallback display with a loading/empty state that does not invent plans the admin did not publish.
- Completed the admin-only pricing slice in `HP-007`.
- Removed the homepage fallback pricing catalog from `frontend/src/lib/payqusta-v3/homepage-config.js` and replaced it with loading and empty-state copy so the homepage no longer fabricates plan cards when the admin has not published any plans yet.
- Updated `frontend/src/components/payqusta-v3/Pricing.jsx` so it now renders only the active plans returned from `/plans`, which means the public homepage pricing now reflects the same plan records the admin manages in the product.
- Kept stable signup routing by continuing to pass the live plan `_id` into the register/subscription flow when the visitor chooses a published plan.
- Added a production-safe empty state for the case where no public plans exist yet, with clear actions to contact the team or start the account flow without pretending that unpublished plans are available.
- User visual-feedback update on 2026-03-31: the pricing cards still need a stronger layout and cleaner visual treatment, and the desktop/laptop experience should place four cards side by side when four published plans exist.
- Implementation intent for the next `HP-007` slice: redesign the pricing cards without changing their live admin-driven data source, improve the card hierarchy, and update the responsive grid so four published plans align in one row on laptop/desktop widths.
- Completed the pricing-card layout polish slice in `HP-007`.
- Reworked the visual structure of `frontend/src/components/payqusta-v3/Pricing.jsx` so the plan cards now have a clearer hierarchy: stronger header treatment, cleaner price block, compact limits summary, and more structured feature rows.
- Updated the pricing grid logic so laptop/desktop widths now render up to four published plans in one row when four plans are available, while still stepping down to two columns and then one column on smaller screens.
- Kept the admin-managed pricing source untouched: this pass improved presentation only and did not reintroduce any local plan fallback or demo catalog.
- User visual-follow-up on 2026-03-31: the pricing cards still feel too tall because the content sizing is too generous. The next pass should tighten typography and spacing without undoing the improved hierarchy.
- Completed the compact-density pricing pass in `HP-007`.
- Reduced typography scale, internal paddings, metadata chip sizing, limits block sizing, and feature-row spacing in `frontend/src/components/payqusta-v3/Pricing.jsx` so the pricing cards now read more compactly and no longer feel overly tall on desktop layouts.
- User UI-feedback on 2026-03-31: the pricing cards and inner items are still too tall in practice. The next pass should reduce structural height, not only typography, by simplifying what each card shows at once.
- Completed the structural-height reduction pass in `HP-007`.
- Reduced visible pricing-card height in `frontend/src/components/payqusta-v3/Pricing.jsx` by limiting visible features to three items, removing the separate long fit-note block, tightening the limits row further, and clamping long plan descriptions and feature text instead of letting them stretch the cards vertically.
- User follow-up on 2026-03-31: the cards still need to be shorter. The next pass should trim the visible payload again so the desktop row feels tighter and less vertically heavy.
- Completed the extra-short pricing pass in `HP-007`.
- Tightened `frontend/src/components/payqusta-v3/Pricing.jsx` again by reducing visible features from three to two, clamping plan descriptions to a single line, shrinking the price block and limits row further, and trimming vertical spacing so the cards render noticeably shorter on desktop.
- Completed the FAQ-clarity slice that closes `HP-007`.
- Updated the visible FAQ copy in `frontend/src/lib/payqusta-v3/i18n-content.js` so setup, hardware, pricing/billing, and team-contact answers now reflect the current admin-published-plan flow and use clearer production-safe language.
- Increased the FAQ answer expansion room in `frontend/src/components/payqusta-v3/FAQCTA.jsx` so the clearer answers do not get clipped when expanded.
- `HP-007` is now complete: pricing and FAQ no longer depend on demo filler behavior and now support real visitor decisions more safely.
- Started `HP-008`.
- Implementation intent for the first `HP-008` slice: review homepage navigation, focus visibility, accordion behavior, and mobile/keyboard interaction flow after the recent homepage refinements.
- Executing the first `HP-008` slice on 2026-03-31: strengthen homepage interaction integrity by improving nav semantics, mobile-menu state handling, visible keyboard focus, and FAQ accordion accessibility attributes.
- Completed the first `HP-008` slice.
- Updated `frontend/src/components/payqusta-v3/Nav.jsx` so the homepage nav now has stronger interaction semantics: the brand mark is a real button for back-to-top behavior, active nav links expose `aria-current`, theme toggles expose pressed state, and the mobile menu trigger/overlay now expose expanded, dialog, and control relationships more clearly.
- Added scroll-lock handling for the mobile menu so the background page does not continue scrolling while the mobile navigation overlay is open.
- Updated `frontend/src/components/payqusta-v3/FAQCTA.jsx` so each FAQ item now exposes `aria-expanded`, `aria-controls`, and labeled region semantics instead of relying on visual state only.
- Added visible keyboard focus treatment for buttons and links in `frontend/src/index.css` so homepage interactions are easier to track during keyboard navigation.
- Completed the second `HP-008` slice.
- Updated `frontend/src/components/payqusta-v3/Nav.jsx` so anchor navigation now scrolls with a fixed-header offset instead of letting sections hide under the nav, and mobile-menu keyboard interaction now traps focus inside the overlay while it is open.
- Updated `frontend/src/pages/PublicLandingPageV3.jsx` and `frontend/src/index.css` so the major homepage anchors are focusable targets with a consistent scroll margin for keyboard and in-page navigation.
- Updated `frontend/src/components/payqusta-v3/FAQCTA.jsx` so accordion expansion now follows the real panel height instead of a fixed max-height guess, reducing the risk of clipped answers as content changes.
- Completed the final `HP-008` interaction review.
- Updated `frontend/src/components/payqusta-v3/Hero.jsx` so the secondary hero CTA now scrolls with the same fixed-header offset and reduced-motion behavior already used by the homepage navigation, instead of using raw `scrollIntoView`.
- `HP-008` is now complete: the main homepage navigation, in-page anchors, FAQ accordion, keyboard flow, and primary interaction paths now have a more consistent interaction model.
- Started `HP-009`.
- Implementation intent for the first `HP-009` slice: remove above-the-fold avoidable weight first, then continue into the heavier chart/effect review for the remaining homepage sections.
- Executing the first `HP-009` slice on 2026-03-31: reduce homepage UI weight by removing the hero's Chart.js dependency, simplifying decorative effects in Hero/FAQ CTA, and adding reduced-motion fallbacks for the most visible homepage animations.
- Completed the first `HP-009` slice.
- Replaced the hero preview mini-chart in `frontend/src/components/payqusta-v3/Hero.jsx` with a lightweight static bar visualization so the top of the homepage no longer ships an avoidable Chart.js render path.
- Reduced heavy blur and glass-style treatments in `frontend/src/components/payqusta-v3/Hero.jsx` and `frontend/src/components/payqusta-v3/FAQCTA.jsx` to keep the same visual direction with less decorative rendering cost.
- Updated `frontend/src/index.css` with a `prefers-reduced-motion` fallback for the homepage's most visible looping animations and transitions.

## Files Touched In This Session

- `docs/public-homepage-v3-execution-role.md`
- `docs/public-homepage-v3-master-task-list.md`
- `docs/public-homepage-v3-worklog.md`
- `frontend/src/lib/payqusta-v3/public-links.js`
- `frontend/src/components/payqusta-v3/Nav.jsx`
- `frontend/src/components/payqusta-v3/Hero.jsx`
- `frontend/src/components/payqusta-v3/TrustHighlights.jsx`
- `frontend/src/components/payqusta-v3/Pricing.jsx`
- `frontend/src/components/payqusta-v3/FAQCTA.jsx`
- `frontend/src/components/payqusta-v3/Footer.jsx`
- `frontend/src/lib/payqusta-v3/homepage-config.js`
- `frontend/src/components/payqusta-v3/Testimonials.jsx`
- `frontend/src/components/payqusta-v3/Reports.jsx`
- `frontend/src/components/payqusta-v3/MetricsPaths.jsx`
- `frontend/src/pages/PublicLandingPageV3.jsx`
- `frontend/src/lib/payqusta-v3/i18n-content.js`
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

## Verification

- confirmed the new docs were created successfully in the repository
- searched the homepage V3 components to confirm hardcoded public actions were removed from the touched areas and now resolve through the shared links module
- ran `npm run sanity:check` in `frontend` successfully
- verified that remote CTA avatar usage was removed from the homepage V3 components
- verified that unsupported footer/social placeholders are no longer rendered as dead clickable links
- re-ran `npm run sanity:check` in `frontend` successfully after switching public contact behavior to `/contact` and after the first `HP-004` config extraction step
- re-ran `npm run sanity:check` in `frontend` successfully after the `FAQCTA.jsx` cleanup and shared-config usage update
- re-ran `npm run sanity:check` in `frontend` successfully after the final `Hero.jsx` shared-config extraction that closed `HP-004`
- ran `npm run sanity:check` in `frontend` successfully after the first `HP-005` credibility-hardening slice
- ran `npm run sanity:check` in `frontend` successfully after the second-pass homepage copy hardening in `i18n-content.js`
- ran `npm run sanity:check` in `frontend` successfully after the first `HP-006` hero-messaging refinement slice
- ran `npm run sanity:check` in `frontend` successfully after the first dashboard-palette alignment pass for homepage accents
- ran `npm run sanity:check` in `frontend` successfully after the first `HP-007` pricing/live-fallback rewrite and final CTA badge cleanup
- ran `npm run sanity:check` in `frontend` successfully after switching homepage pricing to admin-published plans only
- ran `npm run sanity:check` in `frontend` successfully after the pricing-card layout and responsive-grid polish pass
- ran `npm run sanity:check` in `frontend` successfully after the compact-density pricing pass
- ran `npm run sanity:check` in `frontend` successfully after the structural-height reduction pass for pricing cards
- ran `npm run sanity:check` in `frontend` successfully after the extra-short pricing pass
- ran `npm run sanity:check` in `frontend` successfully after the FAQ-clarity pass that closed `HP-007`
- ran `npm run sanity:check` in `frontend` successfully after the first `HP-008` accessibility and interaction-integrity pass
- ran `npm run sanity:check` in `frontend` successfully after the second `HP-008` pass for anchor offset, mobile-menu focus trap, and dynamic FAQ panel height
- ran `npm run sanity:check` in `frontend` successfully after the final `HP-008` hero-CTA interaction fix and the first `HP-009` performance-weight reduction slice

## Next Recommended Step

- continue `HP-009` by auditing the remaining Chart.js usage in `Reports.jsx` and checking whether the reports preview should be simplified, deferred, or kept with lighter rendering settings
