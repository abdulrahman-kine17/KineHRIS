# HRIS v1 — Build plan

Lightweight internal HR system for a ~30-person, two-office, founder-led startup.
Replaces spreadsheets and Notion pages. Fewer features done well.

## Stack

- Next.js (App Router, latest stable), TypeScript, Tailwind CSS.
- Prisma + SQLite. One DB file at `prisma/dev.db`.
- Reads in Server Components, writes in Server Actions. Zod validates every action input.
- Login: pick a seeded user from a list. A signed, HTTP-only cookie holds the user id.
  `requireUser()` runs on every server read and write. All permission rules live in one
  pure module (`lib/permissions.ts`) that also returns a scoped Prisma `where` per role,
  so a manager's queries can never return rows outside their reports.
- Tests: Vitest. Permission rules and the scorecard gate are pure functions with unit tests,
  plus a few DB-backed tests against a throwaway SQLite file.
- Commands:
  - `npm run dev` — creates and seeds the DB if it does not exist, then starts the app. One command.
  - `npm run db:reset` — wipe and reseed.
  - `npm run export` — every table to `exports/<table>.csv` plus one `exports/all.json`.
  - `npm test`.
- Status fields are plain strings with constants in code (no DB enums), so the export is
  portable to any other tool.
- Requires Node 20+. (Machine has Node 24.)

## UI

Black and white. Grey only where needed: borders, secondary text, disabled states, zebra rows.
No accent colours. Status is shown with text labels and outline/filled badges, not colour.
System font stack, dense tables, generous whitespace.

## Org chart (seed)

- Founder (Admin)
  - Product Lead (Manager) → 2 Associate Product Managers
  - HR Manager (Admin)
  - AI Team Lead (Manager) → 24 engineers

30 people total. Teams: Leadership, Product, People, Engineering.
Manager scope = direct and indirect reports from this chart. Team membership is for org views
and filters only.

Note: 24 engineers report directly to the AI Team Lead as specified. If you later want
sub-leads, it is a managerId change in the seed, nothing structural.

## Offices (seed)

- Cairo — Egypt, currency EGP, weekend Fri–Sat.
- Aleppo — Syria, currency USD (salaries in USD; change to SYP if you prefer), weekend Fri–Sat.

Each office has its own public-holiday calendar and weekend days. Working-day counts
(leave days, the 5-working-day outcome flag) skip that office's weekend and holidays.

## Data model (Prisma, ~23 tables)

Every table has a plain `id`, `createdAt`, `updatedAt`. Foreign keys are plain ids.
Nothing is stored as JSON blobs.

### Core
- **Office** — name, city, country, currency, timezone, weekendDays (e.g. "5,6"),
  annualLeaveDays, remoteDays.
- **OfficeHoliday** — officeId, date, name. The public-holiday calendar.
- **Team** — name, leadId → Employee.
- **Employee** — firstName, lastName, workEmail, personalEmail, phone, address,
  emergencyContactName, emergencyContactPhone, title, teamId, managerId, officeId,
  startDate, endDate, probationEndDate, employmentType (full_time | part_time | contractor),
  status (probation | active | notice | left), appRole (admin | manager | employee).
  Mandatory fields are a list in code; completeness % is computed, not stored.

### HR operations
- **LeaveBalance** — employeeId, year, type (annual | remote), allowanceDays.
  Used and remaining are computed from approved requests. Unpaid has no allowance.
- **LeaveRequest** — employeeId, type (annual | remote | unpaid), startDate, endDate,
  workingDays, reason, status (pending | approved | rejected | cancelled), approverId,
  decidedAt, decisionNote.
- Public holidays are not requested; they come from OfficeHoliday and show on the team
  calendar and in balances.
- **Contract** — employeeId, title, type, startDate, endDate (null = open-ended),
  status (draft | signed_by_employee | countersigned | filed), signedByEmployeeAt,
  countersignedAt, filedAt, fileRef (text placeholder, no uploads).

### Recruitment and onboarding
- **Role** — title, teamId, officeId, hiringManagerId, status (open | on_hold | filled | closed),
  openedAt, closedAt, description.
- **Candidate** — roleId, name, email, phone, source, stage
  (applied | screening | interview | offer | hired | rejected), stageChangedAt,
  decision (hire | no_hire | null), decidedAt, outcomeSentAt, notes.
- **Interview** — candidateId, interviewerId, scheduledAt, kind.
- **ScorecardCriterion** — name, weight (five seeded, weights sum to 100).
- **Scorecard** — interviewId (one per interview), recommendation (strong_yes | yes | no | strong_no),
  summary, submittedAt. **ScorecardScore** — scorecardId, criterionId, weight (copied at submit
  time), score 1–5, note.
- **Checklist** — employeeId, kind (onboarding | offboarding). **ChecklistItem** — checklistId,
  title, ownerId, dueDate, doneAt. Templates live in code and are instantiated per person.

### Performance
- **Goal** — employeeId, year, quarter, title, description,
  status (not_started | on_track | at_risk | done | dropped). Server enforces 3–5 per quarter.
- **OneOnOne** — employeeId, managerId, date, notes. **ActionItem** — oneOnOneId, title,
  ownerId, dueDate, doneAt. Notes visible only to the two participants.
- **ReviewCycle** — name, year, half (H1 | H2), selfDueDate, managerDueDate, status (open | closed).
- **Review** — cycleId, employeeId, reviewerId, kind (self | manager | peer),
  status (draft | submitted), summary, submittedAt. **ReviewRating** — reviewId, criterion,
  rating 1–5, comment. Criteria are a fixed list in code.

### Compensation
- **SalaryRecord** — employeeId, amount, currency, effectiveDate, reason, createdById.
  History is the table itself; current salary = latest effectiveDate ≤ today.
- **Benefit** — employeeId, type, description, amount, currency, startDate, endDate.
- **SalaryAdvance** — employeeId, amount, currency, date, note.

### Computed, never stored
Completeness %, leave used/remaining, reminders, the 5-working-day outcome flag,
the monthly payroll sheet, every dashboard number.

## Screens (left nav)

- **Login** — pick a user; shows their role.
- **Dashboard** — headcount by team/office, joiners/leavers, turnover, leave taken, open roles,
  time-to-hire, review and goal coverage, contracts not fully signed. Every number is a link to
  the filtered list behind it.
- **People** — list (search, office, team, completeness bar), profile with tabs
  (Overview · Leave · Contracts · Goals · Reviews · 1:1s · Compensation · Checklists),
  Org view by team and by office.
- **Leave** — my leave + request form, Approvals (managers), Team calendar (month grid with
  public holidays and weekends per office).
- **Contracts** — list with status, "Waiting on signature" section.
- **Reminders** — probation ends, anniversaries, contract renewals, next 90 days.
- **Recruitment** — Roles list, Pipeline board (columns = stages), Candidate page
  (interviews, scorecards, decision gated on all scorecards, outcome sent), Scorecard form.
- **Checklists** — onboarding/offboarding per person with progress and overdue items.
- **Performance** — Goals by quarter, 1:1s, Review cycles with self/manager/peer forms.
- **Compensation** — salary history per employee, benefits, Payroll input sheet
  (month picker, CSV download).

Rules that apply everywhere: search + office + team filter on every list, all held in the URL
(so dashboard links and shareable links work). Empty state on every list. Inline validation
errors on every form. Placeholders marked "Email / calendar would go here" where integrations
would sit.

## Build order

Each step ends with "how to run and what to click".

0. **Foundation** — scaffold, full Prisma schema, seed (30 employees, 2 offices with holiday
   calendars, 5 roles, 20 candidates, plus leave, contracts, goals, reviews, salaries), login,
   permissions module + tests, app shell with nav, export script, README.
1. **People** — list, profile, completeness, org views, edit forms.
2. **HR operations** — leave requests/approvals/balances/calendar, contracts tracker, reminders.
3. **Recruitment and onboarding** — roles, pipeline board, interviews, scorecards, decision gate
   + tests, outcome flag, checklists.
4. **Performance** — goals, 1:1s with action items, review cycles and forms.
5. **Compensation** — salary history, benefits, payroll sheet + CSV.
6. **Dashboard** — all numbers deep-linked to lists.

## Settled decisions

- Manager scope = direct and indirect reports from the org chart.
- 1:1 notes visible only to the two participants. Admin sees that a 1:1 happened, not its notes.
- Working days skip each office's weekend (Fri–Sat) and its public holidays.
- Leave types: annual, remote, unpaid. Public holidays are a per-office calendar.
- Offices: Cairo (EGP) and Aleppo (USD).
- Review criteria, scorecard criteria weights, and checklist templates live in code.
- No audit log, no file uploads. A contract's "file" is a text reference.
- Payroll sheet lists current salary, changes effective that month, unpaid-leave days,
  and advances. No calculation beyond that.
- UI is black and white with light grey.
