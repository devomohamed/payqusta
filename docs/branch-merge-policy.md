# Branch Merge Policy

## Purpose

This document defines the mandatory rules for:

- merging one working branch into another
- resolving Git and semantic conflicts
- promoting reviewed code to `main`

The current reference case is merging `abdo` into `elsheikh`, but the same rules apply to any future branch pair.

## Branch Roles

- `main` is the protected production branch.
- The target branch is the branch that will receive the merge.
- The source branch is the branch being merged into the target.
- For the current workflow:
  - target branch: `elsheikh`
  - source branch: `abdo`

## Core Rules

1. No direct merge into `main`.
2. No direct merge into the target branch on the first attempt when the change set is non-trivial.
3. Every merge must happen on a temporary integration branch such as `merge/abdo-into-elsheikh`.
4. Conflict resolution is based on correct behavior, not on "the latest edit wins".
5. Secrets and environment-specific values must never be copied blindly from one branch to another.
6. Lock files must not be hand-edited unless the exact dependency outcome is understood.
7. Database or schema changes must be reviewed for ordering, compatibility, and data safety before merge completion.
8. File deletion never wins automatically over a modified version of the same file.
9. A clean Git merge is not sufficient if the resulting application behavior is broken.
10. No branch may be promoted unless validation passes for the affected surfaces.

## Ownership And Decision Rules

When both branches touch the same area, resolve by ownership first, then by correctness:

- business logic: prefer the implementation that is functionally correct and better covered by tests
- UI and UX: prefer the version that matches the current API and user flow
- API contracts: prefer the version that preserves compatibility or includes the required coordinated frontend update
- deployment and ops files: prefer the safer and more stable configuration
- database changes: prefer the option that avoids data loss and preserves migration safety
- docs: keep the broader and more accurate documentation

If ownership is clear for a module, the owner of that module gets first priority for that module's behavior decisions.

## Sensitive Files And Areas

These files or categories require line-by-line review during merge:

- `cloudrun.env`
- `cloudrun.env.example`
- deployment scripts such as `deploy-cloudrun.ps1` and `rollback-cloudrun.ps1`
- CI or workflow files under `.github/`
- backend and frontend lock files
- database models, migrations, and seed flows
- auth, permissions, payment, shipping, backup, and webhook code paths

## Conflict Scenarios

### 1. No Git Conflict

If Git reports no conflict, still review the resulting diff for semantic regressions.

### 2. Same Lines Changed In Both Branches

Do not pick one side automatically. Build a final version that preserves the intended behavior.

### 3. No Git Conflict But Runtime Conflict Exists

Example: backend contract changed in one branch and frontend still depends on the old contract in the other branch.

This is a semantic conflict and must be resolved manually before merge completion.

### 4. Config Or Environment Conflict

Keep the target branch values as the baseline for runtime safety. Transfer only the new keys or documented config changes that are actually required.

### 5. Dependency Conflict

Decide the final dependency versions from the merged code first, then regenerate the lock file if needed.

### 6. Delete Versus Modify

Confirm whether the deleted file is truly obsolete. If the file is still referenced or still needed by any flow, deletion must be rejected or delayed.

### 7. Database Or Schema Conflict

Check migration order, backward compatibility, default values, indexes, and whether production data could be damaged.

### 8. Two Different Implementations For The Same Feature

Do not mechanically merge both. Choose one implementation or produce a deliberate combined version.

## Standard Merge Workflow

1. Fetch all remote branches and inspect the diff between source and target.
2. Create a temporary integration branch from the target branch.
3. Merge the source branch into the integration branch.
4. Resolve Git conflicts using the rules in this document.
5. Review changed files for semantic conflicts even if Git is clean.
6. Run validation for the affected backend, frontend, and deployment surfaces.
7. If validation passes, merge the integration branch into the target branch.
8. Only after the target branch is stable may it be considered for promotion to `main`.

## Minimum Validation Gate

At minimum, every non-trivial merge must include:

- backend tests relevant to touched areas
- frontend build if frontend files changed
- smoke checks for the affected critical flows
- manual review of env and deployment files when touched

Recommended project commands:

- `npm --prefix backend run test:ci`
- `npm --prefix backend run test:e2e:readiness`
- `npm --prefix frontend run build`
- `npm --prefix backend run release:preflight`

Run additional targeted tests when payments, shipping, auth, portal, storefront, invoices, or backups are affected.

## Promotion Rules For `main`

These rules are mandatory before any branch is merged into `main`:

1. The branch must already be stable after merging into its target integration branch.
2. No unresolved semantic conflicts may remain.
3. Required tests and build steps must pass.
4. Release-sensitive config must be reviewed manually.
5. `cloudrun.env` must not be committed.
6. The release process must comply with [release-checklist.md](/d:/New%20folder%20(3)/payqusta/docs/release-checklist.md).
7. If the change touches invoices, payments, shipping, customers, products, returns, auth, or deployment, smoke validation is mandatory before or immediately after release according to the release checklist.

## Hard Prohibitions

- no blind acceptance of `ours` or `theirs` for a full merge
- no direct push to `main` after an unreviewed conflict resolution
- no committing secrets or machine-specific env values
- no ignoring lock-file drift after dependency changes
- no merge completion without checking runtime impact

## Default Decision For Future Merges

Unless a specific exception is agreed in advance:

- merge into a temporary integration branch first
- prefer correctness over recency
- prefer safety over speed for config and deployment changes
- prefer data preservation over aggressive cleanup
- require validation before promotion

This document is the default operating policy for future merge operations in this repository, including promotion to `main`.
