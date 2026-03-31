# Support Messages Live Analysis

## Scope

This track covers the support-message experience for:

- admin/vendor users on `/support-messages`
- portal customers on `/portal/support`
- portal customers on `/portal/support/:id`

## Current Problem

- support threads only load on first page entry or after an explicit user action
- new replies are not reflected automatically in the open thread
- admins and customers both need manual refresh to see the latest reply/state

## Root Cause

- the support views fetch once on mount and then stop
- there is no thread-level live refresh loop for the active support conversation
- the existing notification SSE layer is not wired directly into the support chat views
- the portal notification surface does not use the same admin SSE path today

## Safe First Fix

Use visibility-aware polling instead of inventing a new transport layer in this pass:

- poll the open support thread every few seconds while the page is visible
- poll the support list more slowly to refresh statuses and new tickets
- keep the initial loading UX stable and avoid spinner flicker on silent refreshes

## Constraints

- do not break the current support API contract
- do not add a second backend real-time system in this pass
- keep the implementation easy to resume and easy to replace later with SSE/websocket

## Expected Outcome

- admins see new customer replies without manual refresh
- customers see admin replies without manual refresh
- ticket status changes propagate into the visible support views automatically
