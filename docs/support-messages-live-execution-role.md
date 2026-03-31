# Support Messages Live Execution Role

## Objective

Make support-message conversations feel live without requiring manual page refresh.

## Working Rules

- work task by task
- keep the first implementation simple and low-risk
- prefer frontend-side live refresh over transport rewrites unless the current architecture clearly supports more
- keep any polling visibility-aware and scoped to the active support surfaces
- record each significant change in the dedicated worklog

## Engineering Standards

- preserve current API contracts unless a change is clearly needed
- avoid spinner flicker during silent refreshes
- avoid duplicate requests when the page is hidden
- keep the solution replaceable later by SSE or websocket plumbing
- verify with the existing frontend sanity check before closing the task

## Recovery Rule

If work is interrupted, resume from:

- `docs/support-messages-live-worklog.md`
- `docs/support-messages-live-master-task-list.md`
