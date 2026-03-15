# Backup and Restore

## What exists today

The backend exposes tenant-scoped backup endpoints under `/api/v1/backup`.

Available routes:

- `GET /api/v1/backup/export`
- `GET /api/v1/backup/export-json`
- `GET /api/v1/backup/stats`
- `GET /api/v1/backup/auto-settings`
- `PUT /api/v1/backup/auto-settings`
- `POST /api/v1/backup/restore`
- `POST /api/v1/backup/restore-json`

These routes require authenticated tenant admin/vendor access.

Platform-level backup routes also exist for the system owner under `/api/v1/super-admin/backup`:

- `GET /api/v1/super-admin/backup/stats`
- `GET /api/v1/super-admin/backup/export-json`
- `GET /api/v1/super-admin/backup/export-full-json`
- `POST /api/v1/super-admin/backup/restore-json`
- `POST /api/v1/super-admin/backup/restore-full-json`

These routes are intended for platform control-plane backup, not tenant operational backup.

## Export formats

### Excel export

`GET /api/v1/backup/export`

Exports worksheets for:

- products
- customers
- suppliers
- invoices
- expenses

Use case:

- human-readable backup
- spreadsheet-based review
- light business export

### JSON export

`GET /api/v1/backup/export-json`

Exports structured tenant backup data for:

- products
- customers
- suppliers
- invoices
- expenses
- branches
- roles
- users
- subscription requests
- tenant snapshot/config
- notifications
- audit logs
- uploaded file binaries referenced by tenant records

The tenant snapshot currently includes:

- branding
- business info
- settings
- WhatsApp config
- subscription snapshot
- dashboard widgets
- cameras
- addons
- custom-domain state
- active/inactive state

User export includes the password hash required for additive restore, but deliberately excludes runtime auth secrets such as:

- password-reset tokens
- 2FA secret material
- session version state

Use case:

- machine-readable backup
- migration aid
- broader tenant restore path than Excel

## Auto backup opt-in

### Settings endpoints

- `GET /api/v1/backup/auto-settings`
- `PUT /api/v1/backup/auto-settings`

The tenant can opt in once from the backup page, then PayQusta creates daily JSON backups automatically without daily prompts.

Returned auto-backup state includes:

- `enabled`
- `destination.type`
- `retention.keepLast`
- `lastRunAt`
- `lastSuccessAt`
- `lastFailureAt`
- `lastError`
- recent backups and stored count

### V1 behavior

Current implementation:

- stores private tenant-scoped JSON backups inside platform storage
- uses `platform_storage` as the only destination in V1
- keeps the most recent backups according to `retention.keepLast` with a default of `14`
- writes one stable backup key per tenant/day to reduce duplicate runs
- sends in-app notifications only on failure
- keeps manual export/restore available alongside the scheduled path

This is tenant-safe operational backup, not a full disaster-recovery snapshot of the whole SaaS platform.

## Platform backup V1

`GET /api/v1/super-admin/backup/export-json`

Exports a platform-level snapshot for non-tenant control-plane entities:

- plans
- system configs
- public leads

`POST /api/v1/super-admin/backup/restore-json`

Current behavior:

- additive or update-in-place restore
- plans reconcile by `name`
- system configs reconcile by `key`
- public leads restore additively using `email + requestType + submittedAt`
- returns a validation report with supported domains, warnings, and known gaps

Use case:

- preserve the plan catalog and payment-method configuration
- move public leads and platform settings between staging and production-like environments
- reduce platform drift outside tenant-scoped backups

## Full-platform snapshot V1

`GET /api/v1/super-admin/backup/export-full-json`

Exports a wider platform snapshot that combines:

- platform backup V1 domains
- every active tenant with an embedded tenant JSON backup payload

Use case:

- full export archive before high-risk platform maintenance
- staging refreshes where you need both platform control-plane data and tenant operational data in one file
- broader disaster-recovery preparation than tenant-by-tenant exports

Current limitation:

- the new `restore-full-json` route now orchestrates platform restore plus per-tenant restore from one file
- restore still runs additively and tenant-by-tenant rather than as a single global transaction
- it should still not be treated as one-click infrastructure rebuild or perfect all-or-nothing disaster recovery

## Restore behavior

### Excel restore

`POST /api/v1/backup/restore`

Current implementation restores:

- products
- customers
- suppliers

Behavior:

- additive import only
- skips duplicates instead of overwriting existing records
- restores customer and supplier financial summaries from the exported workbook when present
- returns a validation report clarifying Excel restore coverage and current limitations
- uses a MongoDB transaction when the deployment topology supports transactions; otherwise it falls back to sequential additive restore

### JSON restore

`POST /api/v1/backup/restore-json`

Current implementation restores:

- products
- customers
- suppliers
- invoices
- expenses
- branches
- roles
- users
- subscription requests
- tenant snapshot/config
- uploaded file binaries referenced by restored tenant URLs

Behavior:

- additive import only
- skips duplicates instead of overwriting existing records
- relinks branch/user/role references where possible during restore
- restores password hashes for tenant users without replaying reset/session secrets
- restores manual subscription requests when their referenced plan can still be resolved
- restores notifications and audit logs with best-effort reference remapping
- restores `/uploads/...` binary payloads into durable stored-upload records so restored URLs can still resolve without the original local files
- updates the current tenant config in place instead of creating a new tenant record
- returns a validation report describing included domains, missing supported domains, known platform backup gaps, and restore warnings
- attempts to relink invoice customers by tenant customer name before falling back
- uses a MongoDB transaction when the deployment topology supports transactions; otherwise it falls back to sequential additive restore

## Duplicate matching rules

The restore paths do not perform full reconciliation. They use pragmatic duplicate checks:

- products: product name
- customers: phone number
- suppliers: phone number first, then supplier name fallback
- invoices: invoice number
- expenses: description + amount + date
- branches: branch name
- roles: role name
- users: email address
- tenant config: updates current tenant in place

This is safe for additive restores, but not a replacement for a full disaster-recovery tool.

## What is still not backed up yet

The current backup system still does not fully cover the entire SaaS platform. Remaining gaps include:

- external URLs and inline/base64 document payloads that are not stored under `/uploads/...`
- session state and 2FA secret material
- some newer SaaS-management entities outside the current platform backup V1 scope
- one-click restore for guaranteed full-platform snapshots across all tenants

This remains the most important limitation before treating backup/restore as disaster recovery.

## Operational recommendation

For now, prefer JSON export as the primary tenant backup format.

Recommended routine:

1. check `/api/v1/backup/stats`
2. enable auto backup for day-to-day coverage
3. export JSON before major data migration or destructive maintenance
4. archive important backups with tenant name and date
5. test a restore in a non-production environment

## Practical restore guidance

Use restore when you need:

- tenant data migration
- partial recovery after accidental deletion
- moving business records into a fresh tenant sandbox
- reconstructing tenant users/roles/branches after operational loss

Do not assume restore will recreate:

- platform auth/session state
- external file hosts or inline document payloads outside `/uploads/...`
- all operational history
- full SaaS control-plane configuration

## Gaps worth closing later

- full-platform snapshots
- guaranteed all-or-nothing restore on standalone MongoDB deployments
- overwrite/merge strategies
- destination plugins such as Google Drive or Dropbox
