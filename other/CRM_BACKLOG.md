# CRM Backlog

This backlog is organized into `P0`, `P1`, and `P2` so the project can move from an operational commerce platform into a full CRM.

## P0 - Core CRM Foundation

- Create a new `Lead` model in `backend/src/models/Lead.js`.
- Create `leadController` in `backend/src/controllers/leadController.js`.
- Create `leadRoutes` in `backend/src/routes/leadRoutes.js` and mount it in `backend/src/routes/index.js`.
- Add `leads` permissions in `backend/src/config/permissions.js`.
- Enforce tenant isolation for all lead operations.
- Create `LeadsPage` in `frontend/src/pages/LeadsPage.jsx`.
- Add a new leads route in `frontend/src/App.jsx`.
- Add a `Leads` item in `frontend/src/components/Sidebar.jsx`.
- Implement full CRUD for leads.
- Add lead fields:
  - `name`
  - `phone`
  - `email`
  - `source`
  - `status`
  - `assignedTo`
  - `notes`
  - `expectedValue`
  - `tags`
  - `lastContactAt`
- Define lead statuses:
  - `new`
  - `contacted`
  - `qualified`
  - `proposal_sent`
  - `won`
  - `lost`
- Create a new `Task` model in `backend/src/models/Task.js`.
- Create `taskController` and `taskRoutes`.
- Add `tasks` permissions.
- Create `TasksPage` in `frontend/src/pages/TasksPage.jsx`.
- Add route and sidebar entry for tasks.
- Support tasks linked to:
  - lead
  - customer
  - invoice
- Add task fields:
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
- Define task types:
  - `call`
  - `follow_up`
  - `meeting`
  - `payment_reminder`
  - `review`
- Define task statuses:
  - `open`
  - `in_progress`
  - `done`
  - `cancelled`
  - `overdue`
- Create a new `Activity` model in `backend/src/models/Activity.js`.
- Create `activityController` and `activityRoutes`.
- Track activity types:
  - note
  - call
  - whatsapp
  - payment
  - invoice
  - support
- Link activities to:
  - lead
  - customer
  - user
- Build a `Customer 360` MVP in `frontend/src/pages/CustomersPage.jsx`.
- Add a customer-side panel showing:
  - assigned owner
  - last interaction
  - open tasks
  - lead source
  - activity timeline
- Add quick actions:
  - Add Lead
  - Add Task
  - Add Note
- Standardize loading, empty, and error states in:
  - Leads
  - Tasks
  - Customers

## P1 - Sales CRM And Executive UX

- Create a new `Deal` model in `backend/src/models/Deal.js`.
- Create `dealController` and `dealRoutes`.
- Add `deals` permissions.
- Create `DealsPage` in `frontend/src/pages/DealsPage.jsx`.
- Add route and sidebar item for deals.
- Add deal fields:
  - `title`
  - `leadId`
  - `customerId`
  - `stage`
  - `value`
  - `probability`
  - `expectedCloseDate`
  - `owner`
  - `lostReason`
  - `notes`
- Define deal stages:
  - `new`
  - `qualified`
  - `proposal`
  - `negotiation`
  - `won`
  - `lost`
- Support conversions:
  - `Lead -> Deal`
  - `Lead -> Customer`
  - `Deal -> Invoice`
- Build a pipeline view inside `DealsPage`.
- Show pipeline metrics:
  - total pipeline value
  - deals by stage
  - expected closing this week
  - win rate
- Add `lostReason` analytics.
- Redesign `frontend/src/pages/DashboardPage.jsx` into an executive CRM dashboard.
- Add a KPI strip with:
  - open leads
  - overdue tasks
  - open deals
  - pipeline value
  - high-risk customers
- Build an `Alerts Center` page or dashboard widget.
- Add alerts for:
  - overdue follow-up
  - idle high-value lead
  - overdue invoice above threshold
  - customer with rising risk
- Add `Assigned To Me` views in:
  - Leads
  - Tasks
  - Deals
- Add saved views in:
  - Leads
  - Tasks
  - Deals
- Add saved filters per user.
- Reduce sidebar clutter and reorganize navigation.
- Restructure navigation around:
  - Relationships
  - Sales
  - Operations
  - Insights
- Add a `Command Palette` using `Ctrl+K`.
- Build a reusable `Activity Timeline` component.
- Reuse timeline in:
  - Customers
  - Leads
  - Deals
- Add owner CRM metrics:
  - follow-up completion rate
  - average response time
  - lead conversion rate
  - won value by owner

## P2 - Automation, Marketing CRM, And Differentiation

- Create an `AutomationRule` model.
- Create `automationController` and an automation management UI.
- Build a simple rule engine:
  - trigger
  - conditions
  - actions
- Add initial triggers:
  - new lead created
  - no activity for X days
  - invoice overdue
  - task overdue
  - customer inactive
- Add initial actions:
  - create task
  - assign user
  - create alert
  - add tag
  - send whatsapp
- Create a `Segment` model.
- Create `segmentController` and a segments UI.
- Support dynamic segmentation based on:
  - purchase value
  - payment behavior
  - inactivity
  - lead source
  - branch
  - tags
- Create a `Campaign` model.
- Create `campaignController` and a campaigns UI.
- Link campaigns to segments.
- Support channels:
  - whatsapp
  - email
  - internal list
- Track campaign performance:
  - sent
  - delivered
  - response
  - conversion
- Add attribution from `lead source` to `won deal`.
- Add `Customer Risk Score`.
- Add `Lead Score`.
- Add `Opportunity Score`.
- Show explainable score reasons in the UI.
- Build an `Owner Copilot` panel in the dashboard.
- Display:
  - top 3 risks
  - top 3 opportunities
  - tasks due today
  - suggested next actions
- Add win-back flows for inactive customers.
- Add retention alerts.
- Add relationship health score per customer.
- Add branch opportunity and risk correlation widgets.
- Improve the final UX:
  - context drawers instead of excessive modals
  - progressive disclosure
  - less sidebar clutter
  - better navigation between customer, deal, task, and timeline

## Cross-Cutting Technical Tasks

- Break down `backend/src/routes/index.js` into clearer domain routers.
- Keep `backend/src/routes/index.js` as a composition root only.
- Standardize naming conventions across backend and frontend.
- Clean encoding corruption in `README.md` and docs files.
- Remove mojibake from all Arabic UI strings in the frontend.
- Standardize i18n usage across owner, portal, and storefront.
- Add tests for new models:
  - Lead
  - Task
  - Activity
  - Deal
- Add integration tests for core CRM flows.
- Add E2E smoke tests for:
  - create lead
  - assign task
  - move deal
  - convert lead
- Add visual regression tests for core owner screens.
- Document the CRM domain model in project docs.
- Update the permissions matrix to include all new modules.
- Review performance impact after adding new CRM modules.

## Definition Of Done

- Backend and frontend are both implemented for each full-stack task.
- Tenant isolation is enforced.
- Permission checks are enforced.
- Loading, empty, and error states are standardized.
- Happy path and error path are tested.
- New routes are wired correctly.
- Existing flows are not broken.

## Recommended Execution Order

1. Lead
2. Task
3. Activity
4. Customer 360
5. Deal and Pipeline
6. Executive Dashboard
7. Alerts Center
8. Automation
9. Segments and Campaigns
10. Copilot and Scoring
