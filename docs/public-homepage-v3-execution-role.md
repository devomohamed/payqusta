# Public Homepage V3 Execution Role

## Purpose

This file defines the working role, engineering rules, and execution method for the Public Homepage V3 track.

Use it as the operating contract before touching code.

Primary analysis source:

- `docs/public-homepage-v3-analysis.md`

Primary task source:

- `docs/public-homepage-v3-master-task-list.md`

Primary checkpoint log:

- `docs/public-homepage-v3-worklog.md`

## Role Definition

The execution role for this track is:

- `Homepage Refactor and Production-Readiness Engineer`

This role is responsible for converting the current public homepage from a visually strong static marketing page into a production-ready, maintainable, traceable, and verifiable implementation.

## Core Responsibilities

1. preserve working behavior unless a task explicitly changes it
2. reduce placeholders, mock content, and hidden product risk
3. separate content/config from component logic where practical
4. improve maintainability without introducing unnecessary abstraction
5. keep every change recoverable and documented
6. execute tasks one by one in a controlled order

## Engineering Standards

### Source of truth

- do not invent business claims
- do not present demo numbers as verified business facts unless the product owner confirms them
- do not keep silent placeholders in production-facing UI when they can mislead users

### Code structure

- prefer small, bounded edits
- keep component responsibilities clear
- separate page content, links, and UI behavior where possible
- avoid duplicating static data in multiple files
- reuse existing patterns in the repo instead of introducing a parallel system without need

### Safety

- never make hidden business decisions in code
- when business intent is unclear, record the assumption explicitly in the worklog
- do not remove or overwrite user changes outside the current scope
- do not mark a task complete without updating both task status and worklog

### Maintainability

- prefer readable code over clever code
- keep naming explicit
- centralize constants that are reused by multiple sections
- avoid hardcoding production links in many places
- document non-obvious behavior near the execution log and task list

### Accessibility and UX

- preserve keyboard usability
- preserve or improve focus states
- keep CTA labels explicit
- avoid visual elements that imply unsupported integrations or claims
- validate RTL and LTR behavior for every meaningful homepage change

### Performance

- avoid adding heavy client-side logic unless it produces clear value
- treat chart/render effects on the homepage as optional, not sacred
- avoid unnecessary rerenders and oversized assets
- prefer static assets or local assets over unstable external demo resources where feasible

### Verification

- every meaningful code slice must end with a verification step
- verification can be one or more of:
  - focused syntax check
  - frontend validation
  - production build
  - manual smoke test
- if verification cannot run, that must be written into the worklog

## Execution Rules

### Rule 1: single active task

Only one task from the master task list may be `in_progress` at a time.

### Rule 2: log before and after

Before any significant edit:

- write the intended step in `docs/public-homepage-v3-worklog.md`

After the edit:

- record what changed
- record touched files
- record verification result
- record the next recommended step

### Rule 3: task completion requirements

A task is `completed` only if all of the following are true:

- scope implemented
- no unresolved blocker inside the task scope
- verification executed or explicitly waived with reason
- task file updated
- worklog updated

### Rule 4: interruption recovery

If the session stops because of internet loss, IDE hang, machine restart, or any other interruption:

1. read `docs/public-homepage-v3-worklog.md`
2. resume from the latest `Next recommended step`
3. confirm the current file state before making new edits
4. continue the same task unless the worklog says it is complete

### Rule 5: ambiguity handling

If a requirement is not fully clear:

- prefer the safer production-ready interpretation
- record the assumption in the worklog
- avoid irreversible architectural decisions unless required

## Definition of Done for This Track

The homepage track is considered production-ready only when:

- the main homepage no longer depends on misleading placeholders
- critical links and CTA destinations are centralized and valid
- homepage content is structured for safe future edits
- visual trust indicators are either real, clearly labeled, or removed
- task list is fully updated
- worklog contains the final changed-file summary and last verification state

## Recommended Working Order

1. complete structural cleanup first
2. replace risky placeholders next
3. then refine copy and UX
4. then add tracking or secondary enhancements
5. leave optional polish for the final phase

## Non-Negotiable Documentation Files

These files must exist and stay current during execution:

- `docs/public-homepage-v3-analysis.md`
- `docs/public-homepage-v3-execution-role.md`
- `docs/public-homepage-v3-master-task-list.md`
- `docs/public-homepage-v3-worklog.md`

## Immediate Operating Assumptions

Until the user provides different product decisions, assume:

- current homepage numbers are marketing/demo values, not verified live metrics
- current WhatsApp number and several public links are placeholders
- current trust logos and CTA avatars are not production-grade proof assets
- future work should prioritize credibility and maintainability over visual novelty
