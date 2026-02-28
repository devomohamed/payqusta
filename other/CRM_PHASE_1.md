# CRM Phase 1

This file breaks down the first CRM phase into concrete implementation tasks.

## Goal

Turn the current platform into a real CRM foundation by introducing:

- Leads
- Tasks
- Activities
- Customer 360 MVP

This phase must add relationship management without breaking the current sales, invoice, and customer flows.

## Scope

Included in this phase:

- New CRM backend domains: `Lead`, `Task`, `Activity`
- New owner UI pages: `LeadsPage`, `TasksPage`
- Basic CRM navigation
- Customer 360 additions inside the existing customer experience
- Shared UX states for the new CRM screens

Excluded from this phase:

- Deals / pipeline
- Automation engine
- Campaigns / segmentation
- AI scoring / copilot

## Workstream 1: Lead Module

### Backend

- Create `backend/src/models/Lead.js`
- Add fields:
  - `tenant`
  - `name`
  - `phone`
  - `email`
  - `source`
  - `status`
  - `assignedTo`
  - `expectedValue`
  - `tags`
  - `notes`
  - `lastContactAt`
  - `createdBy`
- Add timestamps.
- Add indexes:
  - `{ tenant: 1, status: 1 }`
  - `{ tenant: 1, assignedTo: 1 }`
  - `{ tenant: 1, phone: 1 }`

- Create `backend/src/controllers/leadController.js`
- Implement:
  - `getAll`
  - `getById`
  - `create`
  - `update`
  - `delete`
  - `changeStatus`
  - `assignOwner`

- Create `backend/src/routes/leadRoutes.js`
- Protect all routes with existing auth and tenant middleware.
- Mount routes in `backend/src/routes/index.js` under `/leads`.

- Add lead permissions in `backend/src/config/permissions.js`:
  - `read`
  - `create`
  - `update`
  - `delete`

### Frontend

- Create `frontend/src/pages/LeadsPage.jsx`
- Add route in `frontend/src/App.jsx`
- Add sidebar item in `frontend/src/components/Sidebar.jsx`

- Minimum UI requirements:
  - Leads table/list
  - Search by name / phone / email
  - Filter by status
  - Filter by assigned owner
  - Add lead modal or side panel
  - Edit lead flow
  - Delete lead confirmation
  - Status change action
  - Owner assignment action

- Required lead statuses:
  - `new`
  - `contacted`
  - `qualified`
  - `proposal_sent`
  - `won`
  - `lost`

### Acceptance

- Lead can be created, edited, assigned, filtered, and deleted.
- Lead data is fully tenant-scoped.
- Permissions control visibility and actions.
- UI works in RTL and mobile layouts.

## Workstream 2: Task Module

### Backend

- Create `backend/src/models/Task.js`
- Add fields:
  - `tenant`
  - `title`
  - `type`
  - `priority`
  - `status`
  - `dueDate`
  - `assignedTo`
  - `relatedLead`
  - `relatedCustomer`
  - `relatedInvoice`
  - `notes`
  - `createdBy`
  - `completedAt`
- Add timestamps.
- Add indexes:
  - `{ tenant: 1, status: 1, dueDate: 1 }`
  - `{ tenant: 1, assignedTo: 1, status: 1 }`
  - `{ tenant: 1, relatedCustomer: 1 }`

- Create `backend/src/controllers/taskController.js`
- Implement:
  - `getAll`
  - `getById`
  - `create`
  - `update`
  - `delete`
  - `markDone`
  - `assignTask`

- Create `backend/src/routes/taskRoutes.js`
- Mount routes in `backend/src/routes/index.js` under `/tasks`.

- Add task permissions in `backend/src/config/permissions.js`:
  - `read`
  - `create`
  - `update`
  - `delete`

### Frontend

- Create `frontend/src/pages/TasksPage.jsx`
- Add route in `frontend/src/App.jsx`
- Add sidebar item in `frontend/src/components/Sidebar.jsx`

- Minimum UI requirements:
  - Task list
  - Filters by status / priority / assigned user
  - Due date grouping or sorting
  - Create task modal
  - Edit task
  - Mark task done
  - Delete task

- Required task types:
  - `call`
  - `follow_up`
  - `meeting`
  - `payment_reminder`
  - `review`

- Required task statuses:
  - `open`
  - `in_progress`
  - `done`
  - `cancelled`
  - `overdue`

### Acceptance

- Task can be created and linked to lead, customer, or invoice.
- Overdue tasks are visually distinct.
- Tasks can be assigned and completed.
- Task lists support basic operational filtering.

## Workstream 3: Activity Module

### Backend

- Create `backend/src/models/Activity.js`
- Add fields:
  - `tenant`
  - `type`
  - `title`
  - `description`
  - `lead`
  - `customer`
  - `invoice`
  - `user`
  - `metadata`
  - `createdBy`
- Add timestamps.
- Add indexes:
  - `{ tenant: 1, customer: 1, createdAt: -1 }`
  - `{ tenant: 1, lead: 1, createdAt: -1 }`

- Create `backend/src/controllers/activityController.js`
- Implement:
  - `getAll`
  - `getCustomerTimeline`
  - `getLeadTimeline`
  - `create`

- Create `backend/src/routes/activityRoutes.js`
- Mount routes in `backend/src/routes/index.js` under `/activities`.

### Behavior

- Supported activity types:
  - `note`
  - `call`
  - `whatsapp`
  - `payment`
  - `invoice`
  - `support`

- Manual activity creation must be supported.
- Initial auto-logging must be added for:
  - lead creation
  - task completion
  - manual note creation

### Frontend

- No standalone page required in phase 1.
- Build reusable timeline UI component:
  - `frontend/src/components/ActivityTimeline.jsx`

### Acceptance

- Timeline data is available for customer and lead.
- Manual notes can be added.
- Core CRM actions create visible timeline records.

## Workstream 4: Customer 360 MVP

### Backend

- Extend existing customer detail response in `backend/src/controllers/customerController.js`
- Add CRM-related payload where possible:
  - assigned owner
  - latest activities
  - open tasks count
  - linked leads summary (if converted or matched)

### Frontend

- Enhance `frontend/src/pages/CustomersPage.jsx`
- Add CRM section inside customer details:
  - assigned owner
  - last interaction
  - open tasks
  - lead source
  - activity timeline

- Add quick actions inside customer details:
  - Add Task
  - Add Note
  - View related activities

### Acceptance

- Customer details are no longer finance-only.
- Owner can act from customer context without leaving the page.

## Workstream 5: Shared UX and Navigation

### Navigation

- Add `Leads` entry to `frontend/src/components/Sidebar.jsx`
- Add `Tasks` entry to `frontend/src/components/Sidebar.jsx`
- Place both under a CRM-relevant group, not under unrelated sections.

### Shared States

- Standardize for:
  - loading
  - empty
  - error
  - retry

- Apply to:
  - `LeadsPage`
  - `TasksPage`
  - new CRM blocks in `CustomersPage`

### UX Requirements

- All new screens must support:
  - RTL
  - mobile responsiveness
  - dark mode compatibility
  - keyboard-safe forms

## Workstream 6: Technical Safety

- Add validation middleware for new CRM endpoints.
- Reuse existing `ApiResponse`, `AppError`, and permission checks.
- Ensure all new models are tenant-scoped.
- Ensure no route bypasses auth accidentally.
- Keep changes isolated from:
  - invoice creation
  - payment flows
  - product flows
  - portal flows

## Testing Requirements

- Add backend tests for:
  - lead CRUD
  - task CRUD
  - activity creation
  - tenant isolation on all CRM modules

- Add frontend smoke validation for:
  - leads page loads
  - tasks page loads
  - customer details render CRM section

- Manual verification scenarios:
  1. Create a lead
  2. Assign lead to a user
  3. Create a follow-up task for the lead
  4. Mark task done
  5. Open customer details and verify CRM section
  6. Add a manual note and confirm it appears in the timeline

## Definition Of Done

- Leads, tasks, and activities exist as real backend modules.
- The owner UI exposes Leads and Tasks.
- Customer 360 shows CRM-relevant context.
- Tenant isolation and permissions are enforced.
- The new features do not break existing operational flows.
- Basic tests or smoke checks exist for the new modules.

## Execution Order Inside Phase 1

1. Lead backend
2. Lead frontend
3. Task backend
4. Task frontend
5. Activity backend
6. Activity timeline component
7. Customer 360 enhancements
8. Shared UX states
9. Tests and smoke validation
