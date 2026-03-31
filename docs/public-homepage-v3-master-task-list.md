# Public Homepage V3 Master Task List

## Purpose

This file is the sequential execution queue for the homepage track.

Execution rule:

- work task by task
- do not start the next task before updating the previous one
- update `docs/public-homepage-v3-worklog.md` before and after each meaningful code change

## Status Legend

- `pending`
- `in_progress`
- `blocked`
- `completed`

## Queue

### HP-001

- Title: Create homepage execution control files
- Status: `completed`
- Goal:
  - create the role file
  - create the task list
  - create the worklog
- Output:
  - `docs/public-homepage-v3-execution-role.md`
  - `docs/public-homepage-v3-master-task-list.md`
  - `docs/public-homepage-v3-worklog.md`

### HP-002

- Title: Extract homepage links and public actions into clear constants
- Status: `completed`
- Depends on:
  - `HP-001`
- Goal:
  - remove scattered hardcoded public actions where practical
  - centralize login/register/WhatsApp/social/footer/public CTA destinations
- Scope:
  - homepage V3 components
  - supporting public constants/config
- Done when:
  - critical public links are defined from one clear source
  - placeholder links are either replaced or clearly marked for follow-up

### HP-003

- Title: Identify and replace high-risk placeholders
- Status: `completed`
- Depends on:
  - `HP-002`
- Goal:
  - eliminate the most misleading public placeholders first
- Scope:
  - WhatsApp number
  - `href=\"#\"` public links
  - fake trust indicators that imply real integrations
  - external demo avatars where not acceptable
- Done when:
  - the homepage no longer exposes critical dead-end links or misleading public trust signals

### HP-004

- Title: Move homepage marketing content into a cleaner maintainable structure
- Status: `completed`
- Depends on:
  - `HP-002`
- Goal:
  - improve maintainability of homepage content without breaking the current UI
- Scope:
  - content structure
  - section data organization
  - repeated strings and repeated section config
- Done when:
  - homepage content is easier to edit safely
  - section content and action config are not unnecessarily duplicated

### HP-005

- Title: Review and harden trust and credibility surfaces
- Status: `completed`
- Depends on:
  - `HP-003`
  - `HP-004`
- Goal:
  - make the page credible for a first-time visitor
- Scope:
  - trust strip
  - testimonials
  - metrics
  - reports demo values
  - CTA social proof
- Done when:
  - each trust surface is either validated, softened, or made clearly illustrative

### HP-006

- Title: Refine Hero messaging and CTA hierarchy
- Status: `completed`
- Depends on:
  - `HP-005`
- Goal:
  - make the first screen clearer and less dependent on generic marketing phrasing
- Scope:
  - Hero headline
  - subheadline
  - primary CTA
  - secondary CTA
  - supporting stat strip
  - first-screen color hierarchy aligned with the dashboard palette
- Done when:
  - the hero clearly states value, audience, and action path

### HP-007

- Title: Refine Pricing and FAQ for production use
- Status: `completed`
- Depends on:
  - `HP-004`
  - `HP-006`
- Goal:
  - make pricing and FAQ operationally safer and clearer
- Scope:
  - pricing language
  - plan CTA behavior
  - annual/monthly messaging
  - FAQ clarity around devices, support, setup, and billing
  - pricing/FAQ accent usage aligned with the dashboard palette
- Done when:
  - pricing and FAQ stop reading like demo filler and support real user decisions

### HP-008

- Title: Review homepage accessibility and interaction integrity
- Status: `completed`
- Depends on:
  - `HP-006`
  - `HP-007`
- Goal:
  - validate that homepage interactions remain usable and predictable
- Scope:
  - anchor navigation
  - keyboard flow
  - focus visibility
  - interactive toggles
  - accordion behavior
  - mobile menu behavior
- Done when:
  - main homepage interactions are accessible and stable

### HP-009

- Title: Review homepage performance and unnecessary UI weight
- Status: `in_progress`
- Depends on:
  - `HP-004`
  - `HP-008`
- Goal:
  - reduce avoidable homepage cost without changing the product story
- Scope:
  - charts
  - heavy visual effects
  - remote demo image usage
  - rerender-sensitive components
- Done when:
  - the homepage keeps its visual direction with less avoidable weight

### HP-010

- Title: Add tracking hooks for primary conversion actions
- Status: `pending`
- Depends on:
  - `HP-006`
  - `HP-008`
- Goal:
  - make CTA performance measurable
- Scope:
  - hero CTA
  - pricing CTA
  - final CTA
  - WhatsApp/contact CTA
- Done when:
  - key public actions have a clear analytics hook or tracking integration point

### HP-011

- Title: Final homepage QA pass and production readiness review
- Status: `pending`
- Depends on:
  - `HP-003`
  - `HP-005`
  - `HP-007`
  - `HP-008`
  - `HP-009`
  - `HP-010`
- Goal:
  - validate the homepage end to end
- Scope:
  - RTL/LTR
  - dark/light theme
  - desktop/tablet/mobile
  - public links
  - CTA routes
  - visual regression scan
  - homepage/dashboard color consistency scan
  - final docs sync
- Done when:
  - the homepage slice is documented, verified, and ready for the next release gate

## Current Recommended Next Task

- `HP-009` Review homepage performance and unnecessary UI weight
