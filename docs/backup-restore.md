# Backup and Restore

## What exists today

The backend exposes tenant-scoped backup endpoints under `/api/v1/backup`.

Available routes:

- `GET /api/v1/backup/export`
- `GET /api/v1/backup/export-json`
- `GET /api/v1/backup/stats`
- `POST /api/v1/backup/restore`
- `POST /api/v1/backup/restore-json`

These routes require authenticated tenant admin/vendor access.

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

Exports the same domains in structured JSON:

- products
- customers
- suppliers
- invoices
- expenses

Use case:

- machine-readable backup
- migration aid
- fuller restore path than Excel

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
- uses a MongoDB transaction when the deployment topology supports transactions; otherwise it falls back to sequential additive restore

### JSON restore

`POST /api/v1/backup/restore-json`

Current implementation restores:

- products
- customers
- suppliers
- invoices
- expenses

Behavior:

- additive import only
- skips duplicates instead of overwriting existing records
- attempts to relink invoice customers by tenant customer name before falling back
- uses a MongoDB transaction when the deployment topology supports transactions; otherwise it falls back to sequential additive restore

## Duplicate matching rules

The restore paths do not perform full reconciliation. They use pragmatic duplicate checks:

- products: product name
- customers: phone number
- suppliers: phone number first, then supplier name fallback
- invoices: invoice number
- expenses: description + amount + date

This is safe for additive restores, but not a replacement for a full disaster-recovery tool.

## What is not backed up yet

The current backup system does not fully cover the entire SaaS platform. Gaps include:

- tenant records themselves
- users and passwords
- roles and permissions
- branch definitions
- branding and custom-domain state
- WhatsApp configuration
- notifications and audit logs
- uploads and documents
- addons and subscription requests
- plans and platform-level configuration
- many newer operational and SaaS-management entities

This is the most important limitation to understand before treating backup/restore as disaster recovery.

## Operational recommendation

For now, prefer JSON export as the primary tenant backup format.

Recommended routine:

1. check `/api/v1/backup/stats`
2. export JSON
3. archive it with tenant name and date
4. optionally export Excel for business review
5. test a restore in a non-production environment

## Practical restore guidance

Use restore when you need:

- tenant data migration
- partial recovery after accidental deletion
- moving business records into a fresh tenant sandbox

Do not assume restore will recreate:

- platform auth state
- full SaaS configuration
- uploaded files
- all operational history

## Gaps worth closing later

- full-platform snapshots
- guaranteed all-or-nothing restore on standalone MongoDB deployments
- overwrite/merge strategies
- uploaded-file backup
- restore validation report
- documented retention policy
