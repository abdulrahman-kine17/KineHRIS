# HRIS

A small internal HR system for a ~30-person startup with two offices. It replaces
spreadsheets and Notion pages for people data, leave, contracts, recruitment,
onboarding, performance, compensation and a one-page dashboard.

Everything runs on your own Mac. There is no cloud service and no sign-up.
The database is a single file, `prisma/dev.db`, filled with **fake** sample data.

## Setup (first time, about 5 minutes)

You need two things: Node.js and this folder.

1. **Install Node.js.** Go to <https://nodejs.org>, download the LTS version
   (20 or newer), open the installer and click through it.

2. **Open Terminal.** Press `⌘ Space`, type `Terminal`, press Return.

3. **Go to this folder.** Type `cd ` (with a space), drag this folder from
   Finder into the Terminal window, and press Return.

4. **Install the app's dependencies.** Paste this and press Return. It takes a
   minute or two the first time.

   ```bash
   npm install
   ```

5. **Start the app.**

   ```bash
   npm run dev
   ```

   The first run creates the database and loads the sample company. When you
   see `Ready`, open <http://localhost:3000> in your browser.

6. **Log in.** Pick anyone from the list. There are no passwords in the
   prototype; what each person can see and do is enforced on the server based
   on who they are.

To stop the app, go back to Terminal and press `Ctrl C`.
Next time, only steps 2, 3 and 5 are needed.

## People to try

| Person | Role | What they can do |
| --- | --- | --- |
| Zaher Zidan (Founder) | Admin | Everything, including salaries |
| Heba Mansour (People & Ops) | Admin | Everything, including salaries |
| Karim Nasr (Head of AI) | Manager | The 24 engineers: profiles, leave approvals, reviews. No salaries. |
| Abdulrahman Nasser (Head of Product) | Manager | The two associate PMs |
| Ahmed Ghonim (Senior ML Engineer) | Employee | Only their own data |

Manager scope follows the org chart (who reports to whom), not team names.

## What is built

- **People**: directory with search and filters, profiles with completeness, org views, add/edit.
- **Leave**: balances, requests with a live working-day count, manager approvals, team calendar
  with each office's weekend and public holidays.
- **Contracts**: status tracker (draft → signed by employee → countersigned → filed) with
  "waiting on" counts and one-click advance.
- **Reminders**: probation ends, anniversaries, contract renewals and last days in the next 90 days.
- **Recruitment**: open roles, a pipeline board, interviews with weighted scorecards, a hiring
  decision that is blocked until every scorecard is in, and outcome tracking with a
  5-working-day flag.
- **Checklists**: onboarding and offboarding steps per person from a template, each with an
  owner and a due date.
- **Performance**: 3 to 5 goals per person per quarter, 1:1 notes with action items that only
  the two participants can read, and two review cycles a year with self, manager and optional
  peer reviews on rated criteria.
- **Compensation**: salary history per person with currency and effective date, a benefits
  register, advances, and a monthly payroll input sheet with CSV download. Salaries are visible
  to admins and to each person for themselves only.
- **Dashboard**: headcount by team and office, joiners and leavers, turnover, leave taken, open
  roles, time to hire, goal and review coverage, contracts not fully signed, and a "needs
  attention" list. Every number links to the list behind it. Managers see their reports;
  admins see the company.

All six modules from the brief are built.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app at <http://localhost:3000> (creates the database on first run) |
| `npm run db:reset` | Delete the database and reload the sample data |
| `npm run export` | Write every table to `exports/*.csv` and `exports/all.json` |
| `npm test` | Run the permission and hiring-rule tests |
| `npm run typecheck` | Check the TypeScript |
| `npm run lint` | Check code style |

## Sample data

Two offices: **Cairo** (EGP, Fri–Sat weekend) and **Aleppo** (USD, Fri–Sat
weekend), each with its own public-holiday calendar. 30 current staff plus two
leavers this year, 24 of them engineers. Five open roles, 20 candidates,
interviews with scorecards, leave requests waiting for approval, contracts in
every signature state, goals, 1:1 notes, two review cycles and salary history.

All names, emails, phone numbers and amounts are invented.

## Where things live

```
app/            screens (Next.js App Router)
  login/        pick-a-user login
  (app)/        everything behind the login, one folder per module
components/     shared black-and-white UI pieces
lib/            rules and helpers
  permissions.ts  every access rule, pure functions with tests
  hiring.ts       scorecard gate and outcome SLA, with tests
  workdays.ts     working-day maths per office, with tests
  constants.ts    allowed values, mandatory fields, templates
prisma/
  schema.prisma   the data model
  seed.ts         the sample company
  dev.db          your local database (ignored by git)
scripts/        ensure-db (first run) and export
```

## Moving the data elsewhere

Run `npm run export`. Every table becomes a CSV with plain ids and foreign
keys, and `all.json` holds the same rows together. Status fields are plain
words (for example `signed_by_employee`), not database enums.

## Not included on purpose

Payroll calculation, tax, bank transfers, email or calendar integrations,
mobile, multi-language, single sign-on, AI features.
