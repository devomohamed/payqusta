# Production Readiness Master Task List

## Purpose

This file converts the current production-readiness analysis into an execution board.

Use it when:

- planning the release path to stable production
- distributing work across multiple chats or developers
- deciding what must be done before scale, not just before launch

This board is intentionally split into:

- what is required before general production
- what is required before higher scale
- what is required before very large scale

## Priority Legend

- `P0`: release blocker
- `P1`: required for stable production
- `P2`: required for confident growth
- `P3`: required before very high scale

## Stage Legend

- `Stage A`: before normal production launch
- `Stage B`: before serious growth / heavy traffic
- `Stage C`: before platform-scale traffic

## Ownership Rules

- Do not assign two chats to the same controller or the same deployment/ops file at once.
- Keep app-code changes separate from infra/runbook changes when possible.
- Do not mix performance-test authoring with major business-logic refactors in the same chat.
- Keep caching/queue work under one owner because the contracts affect multiple layers.

## Current Status Summary

What is already in good shape:

- broad backend unit coverage
- integration coverage for major routes
- skip-safe E2E loading in CI
- DB-backed E2E files prepared
- RBAC, branches, and online-fulfillment baseline implemented
- deployment, rollback, and onboarding docs improved

What is still materially missing:

- DB-backed E2E execution in CI
- performance/load testing baseline
- queue/caching/distributed locking foundation
- production dashboards and alert routing
- traffic/scale architecture beyond the current single-service model

## Task Board

### T-PR-001

- Priority: `P0`
- Stage: `Stage A`
- Title: Enable DB-backed E2E in CI
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: none
- Files:
  - `.github/workflows/backend-ci.yml`
  - `backend/tests/e2e/*`
  - `docs/testing-strategy.md`
  - `docs/environment-variables.md`
- Goal:
  - provision `TEST_MONGODB_URI` in CI and run the DB-backed suite for real instead of skip-only mode
- Acceptance criteria:
  - `backend-e2e` GitHub job runs against a real test database
  - at least one successful CI run is recorded with DB-backed E2E enabled

### T-PR-002

- Priority: `P0`
- Stage: `Stage A`
- Title: Define production environment matrix
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: none
- Files:
  - `docs/environment-variables.md`
  - `docs/deployment.md`
  - `cloudrun.env.example`
- Goal:
  - freeze which variables are mandatory in dev, staging, production, and CI
- Acceptance criteria:
  - no critical runtime variable remains ambiguous
  - production/staging/CI examples are documented explicitly

### T-PR-003

- Priority: `P0`
- Stage: `Stage A`
- Title: Verify durable upload storage in production
- Status: `in_progress`
- Parallel-safe: `no`
- Depends on: `T-PR-002`
- Files:
  - `backend/src/middleware/upload.js`
  - `docs/deployment.md`
  - `docs/environment-variables.md`
- Goal:
  - ensure production does not depend on ephemeral local disk for uploads
- Acceptance criteria:
  - production target is set to `gcs` or approved durable fallback
  - one upload round-trip works after deploy

### T-PR-004

- Priority: `P1`
- Stage: `Stage A`
- Title: Add release artifacts and validation outputs to rollout practice
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-PR-002`
- Files:
  - `backend/scripts/release-validate.js`
  - `backend/scripts/ops-snapshot.js`
  - `docs/release-checklist.md`
  - `docs/production-ops.md`
- Goal:
  - make rollout validation artifacts part of normal release execution
- Acceptance criteria:
  - operator checklist includes saving JSON/Markdown artifacts for release validation
  - one sample artifact path is documented and used

### T-PR-005

- Priority: `P1`
- Stage: `Stage A`
- Title: Build minimum production dashboard and alert map
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-PR-002`
- Files:
  - `docs/production-ops.md`
  - `docs/deployment.md`
  - any ops dashboard/runbook docs added
- Goal:
  - define which metrics and alerts are mandatory before calling the system production-ready
- Acceptance criteria:
  - dashboard list exists
  - alert destinations exist
  - ownership for alert response is documented

### T-PR-006

- Priority: `P1`
- Stage: `Stage A`
- Title: Run restore drill for tenant backup
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-004`
- Files:
  - `docs/backup-restore.md`
  - `docs/release-checklist.md`
  - `docs/production-ops.md`
- Goal:
  - prove backup is not only exportable but restorable under controlled conditions
- Acceptance criteria:
  - one successful restore drill is documented
  - recovery time and gaps are recorded

### T-PR-007

- Priority: `P1`
- Stage: `Stage A`
- Title: Establish production smoke scenario ownership
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-PR-004`
- Files:
  - `docs/manual-qa-checklist.md`
  - `docs/release-checklist.md`
- Goal:
  - define who runs which smoke path and when after deploy
- Acceptance criteria:
  - smoke checklist is mapped to explicit surfaces and owners
  - required admin/storefront/portal flows are not left implicit

### T-PR-008

- Priority: `P1`
- Stage: `Stage B`
- Title: Add load-testing baseline
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-001`
- Files:
  - `backend/tests/perf/*` or new perf folder
  - `docs/testing-strategy.md`
  - `docs/production-ops.md`
- Goal:
  - create repeatable load tests for the highest-value flows
- Acceptance criteria:
  - baseline scripts exist for:
    - storefront catalog/read path
    - checkout
    - portal orders
    - admin invoice creation
  - first throughput/latency baseline is recorded

### T-PR-009

- Priority: `P1`
- Stage: `Stage B`
- Title: Capture slow-query and index audit
- Status: `pending`
- Parallel-safe: `no`
- Depends on: `T-PR-008`
- Files:
  - Mongo indexes in `backend/src/models/*`
  - `docs/architecture.md`
  - `docs/production-ops.md`
- Goal:
  - identify the main query hotspots before growth
- Acceptance criteria:
  - slowest read/write paths are listed
  - index gaps are documented
  - remediation tasks are created for critical hotspots

### T-PR-010

- Priority: `P2`
- Stage: `Stage B`
- Title: Introduce Redis for cache and distributed coordination
- Status: `pending`
- Parallel-safe: `no`
- Depends on: `T-PR-008`, `T-PR-009`
- Files:
  - backend ops/runtime layers
  - job-locking code
  - any new cache service modules
  - docs for env/deployment
- Goal:
  - add a shared fast store for caching and coordination
- Acceptance criteria:
  - a chosen Redis use plan exists
  - at least one shared coordination path no longer relies on single-process state only

### T-PR-011

- Priority: `P2`
- Stage: `Stage B`
- Title: Extract background jobs from the web runtime
- Status: `pending`
- Parallel-safe: `no`
- Depends on: `T-PR-010`
- Files:
  - `backend/server.js`
  - `backend/src/jobs/*`
  - deployment docs / scripts
- Goal:
  - stop coupling job execution to every web instance
- Acceptance criteria:
  - jobs run in a dedicated worker/runtime path
  - horizontal scaling of web instances no longer implies duplicate schedulers

### T-PR-012

- Priority: `P2`
- Stage: `Stage B`
- Title: Add async queue foundation for heavy work
- Status: `pending`
- Parallel-safe: `no`
- Depends on: `T-PR-010`
- Files:
  - notification/import/report/export/payment-webhook heavy flows
  - any new queue worker modules
- Goal:
  - move heavy or retry-prone tasks away from request/response critical path
- Acceptance criteria:
  - queue-backed pattern exists for at least one heavy domain
  - retries and dead-letter behavior are documented

### T-PR-013

- Priority: `P2`
- Stage: `Stage B`
- Title: Put storefront assets behind CDN and caching policy
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-003`
- Files:
  - frontend build/deploy docs
  - upload/public asset configuration
  - storefront delivery docs
- Goal:
  - reduce origin load and improve storefront performance under traffic
- Acceptance criteria:
  - static asset caching policy is explicit
  - uploaded media/public assets have a CDN delivery strategy

### T-PR-014

- Priority: `P2`
- Stage: `Stage B`
- Title: Define abuse protection and edge policy
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-008`
- Files:
  - security docs
  - deployment docs
  - any CDN/WAF docs added
- Goal:
  - prepare for bot traffic, scraping, brute-force, and burst abuse
- Acceptance criteria:
  - edge/CDN/WAF posture is defined
  - login, checkout, webhook, and public APIs each have a clear rate-protection story

### T-PR-015

- Priority: `P2`
- Stage: `Stage B`
- Title: Define SLOs and incident response expectations
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-005`
- Files:
  - `docs/production-ops.md`
  - incident/runbook docs
- Goal:
  - move from generic monitoring to operational targets
- Acceptance criteria:
  - latency/error/availability targets are documented
  - incident severity ladder and response ownership are documented

### T-PR-016

- Priority: `P3`
- Stage: `Stage C`
- Title: Reassess single-service deployment model
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-011`, `T-PR-013`
- Files:
  - `docs/architecture.md`
  - deployment docs
  - infra/runbook docs
- Goal:
  - decide whether the platform should remain monolithic at runtime or split into independent deployables
- Acceptance criteria:
  - a target runtime topology is chosen and documented
  - reasons for keeping or splitting the monolith are explicit

### T-PR-017

- Priority: `P3`
- Stage: `Stage C`
- Title: Plan database scale strategy
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-009`
- Files:
  - `docs/architecture.md`
  - `docs/production-ops.md`
  - DB/runbook docs
- Goal:
  - define how MongoDB will scale under large tenant and traffic growth
- Acceptance criteria:
  - replication, archival, backup frequency, and sharding decision are documented

### T-PR-018

- Priority: `P3`
- Stage: `Stage C`
- Title: Build high-scale performance gate
- Status: `pending`
- Parallel-safe: `yes`
- Depends on: `T-PR-008`, `T-PR-010`, `T-PR-013`
- Files:
  - perf test assets
  - release docs
  - ops docs
- Goal:
  - define what numbers must pass before a large-scale launch claim is credible
- Acceptance criteria:
  - concurrency, latency, and failure thresholds are written
  - release cannot claim high-scale readiness without measured results

## Recommended Execution Order

1. `T-PR-001`
2. `T-PR-002`
3. `T-PR-003`
4. `T-PR-004`
5. `T-PR-005`
6. `T-PR-006`
7. `T-PR-008`
8. `T-PR-009`
9. `T-PR-010`
10. `T-PR-011`
11. `T-PR-012`
12. `T-PR-013`
13. `T-PR-014`
14. `T-PR-015`
15. `T-PR-016`
16. `T-PR-017`
17. `T-PR-018`

## Suggested Multi-Chat Split

### Chat A

- `T-PR-001`
- `T-PR-002`
- `T-PR-004`
- `T-PR-007`

Reason:

- CI/release/docs execution path

### Chat B

- `T-PR-003`
- `T-PR-013`
- `T-PR-014`

Reason:

- delivery, storage, and edge posture

### Chat C

- `T-PR-005`
- `T-PR-015`

Reason:

- monitoring, alerting, and incident operations

### Chat D

- `T-PR-008`
- `T-PR-018`

Reason:

- performance and scale validation

### Chat E

- `T-PR-009`
- `T-PR-017`

Reason:

- database capacity and query strategy

### Chat F

- `T-PR-010`
- `T-PR-011`
- `T-PR-012`
- `T-PR-016`

Reason:

- runtime architecture, workers, queueing, and distributed coordination

## Best Next Step

Start with:

- `T-PR-001`
- `T-PR-002`
- `T-PR-003`

Reason:

- these are the smallest set that turns the project from "good engineering progress" into "serious production preparation"
