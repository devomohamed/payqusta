# Support Messages Live Master Task List

Execution rule:

- complete tasks in order
- update status when a task starts or finishes
- reflect every meaningful code change in the matching worklog

### SM-001

- Title: Create execution-control files for support live-refresh work
- Status: `completed`
- Goal:
  - make the support-live initiative trackable and recoverable

### SM-002

- Title: Audit current support refresh behavior and identify the safest live strategy
- Status: `completed`
- Goal:
  - confirm why support messages need manual refresh today

### SM-003

- Title: Make admin support threads and support list refresh automatically
- Status: `completed`
- Depends on:
  - `SM-002`
- Goal:
  - remove manual refresh dependency from `/support-messages`

### SM-004

- Title: Make portal support tickets and support chat refresh automatically
- Status: `completed`
- Depends on:
  - `SM-002`
  - `SM-003`
- Goal:
  - remove manual refresh dependency from `/portal/support` and `/portal/support/:id`

### SM-005

- Title: Verify interaction stability and document the live-refresh behavior
- Status: `completed`
- Depends on:
  - `SM-003`
  - `SM-004`
- Goal:
  - confirm the live-refresh path works without degrading the current UX

## Current Recommended Next Task

- no active task; the support live-refresh pass is implemented and verified
