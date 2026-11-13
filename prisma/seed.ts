// Seed: a fake 30-person AI startup with offices in Cairo and Aleppo.
// Everything here is invented. Dates are relative to the day you run it so
// reminders, pending approvals and overdue flags always have something to show.

import { PrismaClient } from "@prisma/client";
import { ONBOARDING_TEMPLATE, OFFBOARDING_TEMPLATE, REVIEW_CRITERIA, type ChecklistTemplateItem } from "../lib/constants";
import { addDays, today, utcDate, startOfMonth } from "../lib/dates";
import { countWorkingDays, makeCalendar } from "../lib/workdays";

const prisma = new PrismaClient();

// Deterministic pseudo-random so every reseed looks the same.
let seedState = 20261113;
function rand(): number {
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1));

const T = today();
const ago = (n: number) => addDays(T, -n);
const ahead = (n: number) => addDays(T, n);
const THIS_YEAR = T.getUTCFullYear();

const DOMAIN = "northstar-ai.example";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

// ------------------------------------------------------------------ offices

const OFFICES = {
  cairo: {
    id: "office_cairo",
    name: "Cairo",
    city: "Cairo",
    country: "Egypt",
    currency: "EGP",
    timezone: "Africa/Cairo",
    weekendDays: "5,6",
    annualLeaveDays: 21,
    remoteDays: 12,
  },
  aleppo: {
    id: "office_aleppo",
    name: "Aleppo",
    city: "Aleppo",
    country: "Syria",
    currency: "USD",
    timezone: "Asia/Damascus",
    weekendDays: "5,6",
    annualLeaveDays: 24,
    remoteDays: 12,
  },
} as const;
type OfficeKey = keyof typeof OFFICES;

// Public holidays. Islamic dates are approximate (they follow the lunar calendar).
const HOLIDAYS: Record<OfficeKey, [number, number, number, string][]> = {
  cairo: [
    [2026, 1, 7, "Coptic Christmas"],
    [2026, 1, 25, "Revolution Day"],
    [2026, 3, 20, "Eid al-Fitr"],
    [2026, 3, 21, "Eid al-Fitr"],
    [2026, 3, 22, "Eid al-Fitr"],
    [2026, 4, 13, "Sham El-Nessim"],
    [2026, 4, 25, "Sinai Liberation Day"],
    [2026, 5, 1, "Labour Day"],
    [2026, 5, 27, "Eid al-Adha"],
    [2026, 5, 28, "Eid al-Adha"],
    [2026, 5, 29, "Eid al-Adha"],
    [2026, 6, 16, "Islamic New Year"],
    [2026, 6, 30, "30 June Revolution"],
    [2026, 7, 23, "Revolution Day"],
    [2026, 8, 25, "Prophet's Birthday"],
    [2026, 10, 6, "Armed Forces Day"],
    [2027, 1, 7, "Coptic Christmas"],
    [2027, 1, 25, "Revolution Day"],
    [2027, 3, 9, "Eid al-Fitr"],
    [2027, 3, 10, "Eid al-Fitr"],
    [2027, 3, 11, "Eid al-Fitr"],
    [2027, 4, 25, "Sinai Liberation Day"],
    [2027, 5, 1, "Labour Day"],
    [2027, 5, 3, "Sham El-Nessim"],
  ],
  aleppo: [
    [2026, 1, 1, "New Year's Day"],
    [2026, 3, 8, "Revolution Day"],
    [2026, 3, 20, "Eid al-Fitr"],
    [2026, 3, 21, "Eid al-Fitr"],
    [2026, 3, 22, "Eid al-Fitr"],
    [2026, 4, 17, "Independence Day"],
    [2026, 5, 1, "Labour Day"],
    [2026, 5, 6, "Martyrs' Day"],
    [2026, 5, 27, "Eid al-Adha"],
    [2026, 5, 28, "Eid al-Adha"],
    [2026, 5, 29, "Eid al-Adha"],
    [2026, 5, 30, "Eid al-Adha"],
    [2026, 6, 16, "Islamic New Year"],
    [2026, 8, 25, "Prophet's Birthday"],
    [2026, 12, 25, "Christmas Day"],
    [2027, 1, 1, "New Year's Day"],
    [2027, 3, 9, "Eid al-Fitr"],
    [2027, 3, 10, "Eid al-Fitr"],
    [2027, 3, 11, "Eid al-Fitr"],
    [2027, 4, 17, "Independence Day"],
    [2027, 5, 1, "Labour Day"],
    [2027, 5, 6, "Martyrs' Day"],
  ],
};

// ------------------------------------------------------------------ people

type Spec = {
  first: string;
  last: string;
  title: string;
  team: "Leadership" | "Product" | "People" | "Engineering";
  office: OfficeKey;
  manager?: string; // key of manager
  appRole: "admin" | "manager" | "employee";
  start: Date;
  type?: "full_time" | "part_time" | "contractor";
  status?: "probation" | "active" | "notice" | "left";
  end?: Date;
  probationEnd?: Date;
  /** Leave some mandatory fields blank so completeness has something to show. */
  gaps?: ("personalEmail" | "address" | "emergency" | "phone")[];
  /** Monthly gross in the office currency. */
  salary: number;
  /** Salary history before the current amount: [effective date, amount, reason]. */
  history?: [Date, number, string][];
};

const key = (s: Spec) => slug(`${s.first}_${s.last}`);

const SPECS: Spec[] = [
  // Leadership
  { first: "Zaher", last: "Zidan", title: "Founder & CEO", team: "Leadership", office: "cairo", appRole: "admin", start: utcDate(2022, 1, 10), salary: 200000 },
  { first: "Abdulrahman", last: "Nasser", title: "Head of Product", team: "Product", office: "cairo", manager: "zaher_zidan", appRole: "manager", start: utcDate(2022, 6, 1), salary: 160000, history: [[utcDate(2022, 6, 1), 120000, "hire"], [utcDate(2024, 7, 1), 140000, "annual_review"]] },
  { first: "Heba", last: "Mansour", title: "People & Operations Manager", team: "People", office: "cairo", manager: "zaher_zidan", appRole: "admin", start: utcDate(2023, 2, 13), salary: 90000, history: [[utcDate(2023, 2, 13), 70000, "hire"]] },
  { first: "Karim", last: "Nasr", title: "Head of AI Engineering", team: "Engineering", office: "aleppo", manager: "zaher_zidan", appRole: "manager", start: utcDate(2022, 3, 7), salary: 4500, history: [[utcDate(2022, 3, 7), 3500, "hire"], [utcDate(2024, 1, 1), 4000, "promotion"]] },
  // Product
  { first: "Dina", last: "Mansour", title: "Associate Product Manager", team: "Product", office: "cairo", manager: "abdulrahman_nasser", appRole: "employee", start: utcDate(2024, 11, 18), salary: 60000, history: [[utcDate(2024, 11, 18), 52000, "hire"]] },
  { first: "Yara", last: "Qassem", title: "Associate Product Manager", team: "Product", office: "aleppo", manager: "abdulrahman_nasser", appRole: "employee", start: utcDate(2025, 3, 3), salary: 1500, gaps: ["emergency"] },
  // Engineering, Cairo
  { first: "Ahmed", last: "Ghonim", title: "Senior ML Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2022, 9, 5), salary: 150000, history: [[utcDate(2022, 9, 5), 95000, "hire"], [utcDate(2024, 7, 1), 120000, "annual_review"]] },
  { first: "Menna", last: "Mahmoud", title: "ML Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 12, 1), salary: 95000, history: [[utcDate(2023, 12, 1), 80000, "hire"]] },
  { first: "Youssef", last: "Hamdy", title: "Backend Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 1, 15), salary: 85000, history: [[utcDate(2024, 1, 15), 72000, "hire"]] },
  { first: "Salma", last: "Tawfik", title: "Data Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 5, 22), salary: 90000, history: [[utcDate(2023, 5, 22), 75000, "hire"]], gaps: ["address"] },
  { first: "Mohamed", last: "Sarhan", title: "Platform Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2022, 11, 21), salary: 110000, history: [[utcDate(2022, 11, 21), 80000, "hire"], [utcDate(2024, 7, 1), 95000, "annual_review"]] },
  { first: "Hagar", last: "Lialy", title: "Frontend Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 6, 10), salary: 78000, history: [[utcDate(2024, 6, 10), 70000, "hire"]] },
  { first: "Tarek", last: "Sobhy", title: "Software Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2025, 1, 6), salary: 65000 },
  { first: "Rana", last: "Ismail", title: "Research Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 8, 14), salary: 105000, history: [[utcDate(2023, 8, 14), 85000, "hire"]] },
  { first: "Mahmoud", last: "Reda", title: "MLOps Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 2, 5), salary: 92000, history: [[utcDate(2024, 2, 5), 80000, "hire"]], gaps: ["personalEmail", "emergency"] },
  { first: "Farida", last: "Lotfy", title: "Software Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2025, 9, 1), salary: 60000, type: "contractor", end: utcDate(2027, 1, 15) },
  { first: "Kareem", last: "Abdelaziz", title: "ML Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: ago(75), salary: 80000, status: "probation", probationEnd: ahead(15) },
  { first: "Nadine", last: "Wahdan", title: "ML Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: ago(20), salary: 82000, status: "probation", probationEnd: ahead(70), gaps: ["address", "emergency", "personalEmail"] },
  // Engineering, Aleppo
  { first: "Sami", last: "Khoury", title: "Senior ML Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2022, 5, 16), salary: 3200, history: [[utcDate(2022, 5, 16), 2200, "hire"], [utcDate(2024, 7, 1), 2800, "annual_review"]] },
  { first: "Rania", last: "Barakat", title: "ML Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 11, 27), salary: 2100, history: [[utcDate(2023, 11, 27), 1800, "hire"]] },
  { first: "Fadi", last: "Masri", title: "Backend Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 4, 1), salary: 1900, history: [[utcDate(2024, 4, 1), 1600, "hire"]] },
  { first: "Lina", last: "Shami", title: "Data Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 1, 9), salary: 2300, history: [[utcDate(2023, 1, 9), 1900, "hire"]] },
  { first: "Bashar", last: "Hamwi", title: "Platform Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2022, 8, 22), salary: 2600, history: [[utcDate(2022, 8, 22), 2000, "hire"]] },
  { first: "Dem", last: "Regner", title: "Frontend Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 12, 2), salary: 1600, gaps: ["phone"] },
  { first: "Nizar", last: "Jabri", title: "Software Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2025, 2, 17), salary: 1400 },
  { first: "Hala", last: "Sabbagh", title: "Research Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 6, 5), salary: 2400, history: [[utcDate(2023, 6, 5), 2000, "hire"]] },
  { first: "Wael", last: "Zein", title: "MLOps Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 8, 19), salary: 1900, history: [[utcDate(2024, 8, 19), 1700, "hire"]] },
  { first: "Dana", last: "Atassi", title: "Software Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2025, 6, 2), salary: 1300, type: "contractor", end: ahead(45) },
  { first: "Rami", last: "Halabi", title: "Software Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 10, 7), salary: 1500, status: "notice", end: ahead(21), type: "contractor" },
  { first: "Joud", last: "Mardini", title: "ML Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: ago(40), salary: 1700, status: "probation", probationEnd: ahead(50) },
  // Left this year (keeps turnover and offboarding data realistic)
  { first: "Ziad", last: "Fouad", title: "Software Engineer", team: "Engineering", office: "cairo", manager: "karim_nasr", appRole: "employee", start: utcDate(2023, 3, 6), end: utcDate(THIS_YEAR, 3, 31), status: "left", salary: 70000 },
  { first: "Tala", last: "Ajlani", title: "Data Engineer", team: "Engineering", office: "aleppo", manager: "karim_nasr", appRole: "employee", start: utcDate(2024, 5, 13), end: utcDate(THIS_YEAR, 8, 15), status: "left", salary: 1800 },
];

const STREETS_CAIRO = ["12 Road 9, Maadi", "4 Ahmed Orabi St, Mohandessin", "22 El Nasr Rd, Nasr City", "7 Mosadak St, Dokki", "15 Salah Salem, Heliopolis"];
const STREETS_ALEPPO = ["5 Baron St, Aziziyeh", "18 Shahba Rd, New Aleppo", "9 Nile St, Mogambo", "3 Furqan St, Furqan", "11 Siryan St, Siryan"];

function contact(spec: Spec, i: number) {
  const gaps = new Set(spec.gaps ?? []);
  const cairo = spec.office === "cairo";
  const phone = cairo ? `+20 10${String(10000000 + i * 7351).slice(0, 8)}` : `+963 9${String(10000000 + i * 5147).slice(0, 8)}`;
  return {
    phone: gaps.has("phone") ? null : phone,
    personalEmail: gaps.has("personalEmail") ? null : `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}@mail.example`,
    address: gaps.has("address") ? null : `${pick(cairo ? STREETS_CAIRO : STREETS_ALEPPO)}, ${cairo ? "Cairo" : "Aleppo"}`,
    emergencyContactName: gaps.has("emergency") ? null : pick(["Hassan", "Mona", "Samir", "Huda", "Nabil", "Amal"]) + " " + spec.last,
    emergencyContactPhone: gaps.has("emergency") ? null : (cairo ? `+20 11${String(20000000 + i * 913).slice(0, 8)}` : `+963 9${String(30000000 + i * 613).slice(0, 8)}`),
  };
}

// ------------------------------------------------------------------ main

async function main() {
  console.log("Clearing tables...");
  // Order matters only for tables without cascades from Employee.
  await prisma.scorecardScore.deleteMany();
  await prisma.scorecard.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.role.deleteMany();
  await prisma.scorecardCriterion.deleteMany();
  await prisma.reviewRating.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reviewCycle.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.oneOnOne.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.salaryAdvance.deleteMany();
  await prisma.benefit.deleteMany();
  await prisma.salaryRecord.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.team.updateMany({ data: { leadId: null } });
  await prisma.employee.updateMany({ data: { managerId: null } });
  await prisma.employee.deleteMany();
  await prisma.team.deleteMany();
  await prisma.officeHoliday.deleteMany();
  await prisma.office.deleteMany();

  console.log("Offices and holidays...");
  for (const o of Object.values(OFFICES)) await prisma.office.create({ data: o });
  for (const [k, list] of Object.entries(HOLIDAYS) as [OfficeKey, typeof HOLIDAYS.cairo][]) {
    await prisma.officeHoliday.createMany({
      data: list.map(([y, m, d, name]) => ({ officeId: OFFICES[k].id, date: utcDate(y, m, d), name })),
    });
  }
  const calendars = {
    cairo: makeCalendar("5,6", HOLIDAYS.cairo.map(([y, m, d]) => utcDate(y, m, d))),
    aleppo: makeCalendar("5,6", HOLIDAYS.aleppo.map(([y, m, d]) => utcDate(y, m, d))),
  };

  console.log("Teams...");
  const teams: Record<string, string> = {};
  for (const name of ["Leadership", "Product", "People", "Engineering"]) {
    const t = await prisma.team.create({ data: { id: `team_${slug(name)}`, name } });
    teams[name] = t.id;
  }

  console.log("Employees...");
  const E: Record<string, string> = {}; // key -> id
  const specByKey: Record<string, Spec> = {};
  SPECS.forEach((s, i) => {
    E[key(s)] = `emp_${key(s)}`;
    specByKey[key(s)] = s;
    void i;
  });
  // Managers first so managerId references exist.
  const ordered = [...SPECS].sort((a, b) => (a.manager ? 1 : 0) - (b.manager ? 1 : 0) || (a.appRole === "manager" ? -1 : 0));
  let i = 0;
  for (const s of ordered) {
    i++;
    const status = s.status ?? "active";
    await prisma.employee.create({
      data: {
        id: E[key(s)],
        firstName: s.first,
        lastName: s.last,
        workEmail: `${s.first.toLowerCase()}.${s.last.toLowerCase()}@${DOMAIN}`,
        title: s.title,
        teamId: teams[s.team],
        managerId: s.manager ? E[s.manager] : null,
        officeId: OFFICES[s.office].id,
        startDate: s.start,
        endDate: s.end ?? null,
        probationEndDate: s.probationEnd ?? (status === "left" ? null : addDays(s.start, 90)),
        employmentType: s.type ?? "full_time",
        status,
        appRole: s.appRole,
        ...contact(s, i),
      },
    });
  }
  await prisma.team.update({ where: { id: teams.Leadership }, data: { leadId: E.zaher_zidan } });
  await prisma.team.update({ where: { id: teams.Product }, data: { leadId: E.abdulrahman_nasser } });
  await prisma.team.update({ where: { id: teams.People }, data: { leadId: E.heba_mansour } });
  await prisma.team.update({ where: { id: teams.Engineering }, data: { leadId: E.karim_nasr } });

  const current = SPECS.filter((s) => (s.status ?? "active") !== "left");
  const cal = (s: Spec) => calendars[s.office];
  const currency = (s: Spec) => OFFICES[s.office].currency;

  console.log("Leave balances and requests...");
  for (const s of current) {
    await prisma.leaveBalance.createMany({
      data: [
        { employeeId: E[key(s)], year: THIS_YEAR, type: "annual", allowanceDays: OFFICES[s.office].annualLeaveDays },
        { employeeId: E[key(s)], year: THIS_YEAR, type: "remote", allowanceDays: OFFICES[s.office].remoteDays },
      ],
    });
  }
  type Leave = { who: string; type: "annual" | "remote" | "unpaid"; from: Date; to: Date; status: "pending" | "approved" | "rejected" | "cancelled"; by?: string; note?: string; reason?: string };
  const leaves: Leave[] = [
    // waiting on Karim
    { who: "ahmed_ghonim", type: "annual", from: ahead(10), to: ahead(14), status: "pending", reason: "Family trip" },
    { who: "sami_khoury", type: "remote", from: ahead(5), to: ahead(6), status: "pending", reason: "Working from Damascus" },
    { who: "lina_shami", type: "unpaid", from: ahead(20), to: ahead(21), status: "pending", reason: "Personal" },
    // waiting on Omar
    { who: "dina_mansour", type: "annual", from: ahead(30), to: ahead(34), status: "pending" },
    // decided
    { who: "mohamed_sarhan", type: "unpaid", from: ago(5), to: ago(4), status: "approved", by: "karim_nasr" },
    { who: "rania_barakat", type: "annual", from: ago(8), to: ago(6), status: "approved", by: "karim_nasr" },
    { who: "hagar_lialy", type: "annual", from: ahead(40), to: ahead(44), status: "approved", by: "karim_nasr" },
    { who: "tarek_sobhy", type: "annual", from: ago(21), to: ago(18), status: "rejected", by: "karim_nasr", note: "Release week, please move it" },
    { who: "fadi_masri", type: "remote", from: ago(2), to: ago(2), status: "approved", by: "karim_nasr" },
    { who: "yara_qassem", type: "annual", from: ago(60), to: ago(55), status: "approved", by: "abdulrahman_nasser" },
    { who: "bashar_hamwi", type: "annual", from: ago(95), to: ago(85), status: "approved", by: "karim_nasr" },
    { who: "salma_tawfik", type: "annual", from: ago(130), to: ago(124), status: "approved", by: "karim_nasr" },
    { who: "menna_mahmoud", type: "remote", from: ago(15), to: ago(13), status: "approved", by: "karim_nasr" },
    { who: "wael_zein", type: "annual", from: ago(200), to: ago(192), status: "approved", by: "karim_nasr" },
    { who: "rana_ismail", type: "annual", from: ago(45), to: ago(41), status: "approved", by: "karim_nasr" },
    { who: "youssef_hamdy", type: "unpaid", from: ago(12), to: ago(12), status: "approved", by: "karim_nasr" },
    { who: "abdulrahman_nasser", type: "annual", from: ago(100), to: ago(93), status: "approved", by: "zaher_zidan" },
    { who: "karim_nasr", type: "annual", from: ahead(60), to: ahead(66), status: "pending" },
    { who: "heba_mansour", type: "remote", from: ago(30), to: ago(29), status: "approved", by: "zaher_zidan" },
    { who: "dem_regner", type: "annual", from: ago(10), to: ago(9), status: "cancelled" },
    { who: "hala_sabbagh", type: "annual", from: ago(250), to: ago(244), status: "approved", by: "karim_nasr" },
    { who: "nizar_jabri", type: "remote", from: ago(70), to: ago(69), status: "approved", by: "karim_nasr" },
    { who: "mahmoud_reda", type: "annual", from: ago(160), to: ago(156), status: "approved", by: "karim_nasr" },
  ];
  for (const l of leaves) {
    const s = specByKey[l.who];
    await prisma.leaveRequest.create({
      data: {
        employeeId: E[l.who],
        type: l.type,
        startDate: l.from,
        endDate: l.to,
        workingDays: countWorkingDays(l.from, l.to, cal(s)),
        reason: l.reason ?? null,
        status: l.status,
        approverId: l.by ? E[l.by] : null,
        decidedAt: l.by ? addDays(l.from, -3) : null,
        decisionNote: l.note ?? null,
        createdAt: addDays(l.from, -7),
      },
    });
  }

  console.log("Contracts...");
  const contractStatus: Record<string, "draft" | "signed_by_employee" | "countersigned" | "filed"> = {
    nadine_wahdan: "draft",
    joud_mardini: "signed_by_employee",
    kareem_abdelaziz: "filed",
    tarek_sobhy: "countersigned",
    dem_regner: "countersigned",
    nizar_jabri: "signed_by_employee",
  };
  for (const s of SPECS) {
    const k = key(s);
    const status = contractStatus[k] ?? "filed";
    const type = s.type === "contractor" ? "contractor" : s.end && (s.status ?? "active") !== "left" ? "fixed_term" : "permanent";
    const signed = status !== "draft" ? addDays(s.start, -5) : null;
    const counter = status === "countersigned" || status === "filed" ? addDays(s.start, -3) : null;
    const filed = status === "filed" ? addDays(s.start, -1) : null;
    await prisma.contract.create({
      data: {
        employeeId: E[k],
        title: `${type === "contractor" ? "Contractor agreement" : "Employment contract"} – ${s.title}`,
        type,
        startDate: s.start,
        endDate: s.type === "contractor" ? s.end ?? null : (s.status ?? "active") === "left" ? s.end ?? null : null,
        status,
        signedByEmployeeAt: signed,
        countersignedAt: counter,
        filedAt: filed,
        fileRef: status === "filed" ? `contracts/${THIS_YEAR}/${k}.pdf` : null,
      },
    });
  }

  console.log("Recruitment...");
  const criteria = [
    ["Technical depth", 30],
    ["Problem solving", 25],
    ["Communication", 15],
    ["Collaboration", 15],
    ["Role fit", 15],
  ] as const;
  const C: Record<string, string> = {};
  for (const [idx, [name, weight]] of criteria.entries()) {
    const c = await prisma.scorecardCriterion.create({ data: { name, weight, sortOrder: idx } });
    C[name] = c.id;
  }

  const roles = [
    { id: "role_senior_ml_aleppo", title: "Senior ML Engineer", team: "Engineering", office: "aleppo" as OfficeKey, hm: "karim_nasr", status: "open", opened: ago(45) },
    { id: "role_backend_cairo", title: "Backend Engineer", team: "Engineering", office: "cairo" as OfficeKey, hm: "karim_nasr", status: "open", opened: ago(30) },
    { id: "role_product_designer", title: "Product Designer", team: "Product", office: "cairo" as OfficeKey, hm: "abdulrahman_nasser", status: "open", opened: ago(60) },
    { id: "role_mlops_aleppo", title: "MLOps Engineer", team: "Engineering", office: "aleppo" as OfficeKey, hm: "karim_nasr", status: "open", opened: ago(20) },
    { id: "role_recruiter", title: "Technical Recruiter", team: "People", office: "cairo" as OfficeKey, hm: "heba_mansour", status: "open", opened: ago(10) },
    { id: "role_ml_cairo_filled", title: "ML Engineer", team: "Engineering", office: "cairo" as OfficeKey, hm: "karim_nasr", status: "filled", opened: ago(120), closed: ago(50) },
  ];
  for (const r of roles) {
    await prisma.role.create({
      data: {
        id: r.id,
        title: r.title,
        teamId: teams[r.team],
        officeId: OFFICES[r.office].id,
        hiringManagerId: E[r.hm],
        status: r.status,
        openedAt: r.opened,
        closedAt: r.closed ?? null,
        description: `${r.title} for the ${r.team} team in ${OFFICES[r.office].city}.`,
      },
    });
  }

  type Cand = {
    role: string;
    name: string;
    stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
    applied: number; // days ago
    stageChanged?: number;
    source?: string;
    decision?: "hire" | "no_hire";
    decided?: number; // days ago
    outcomeSent?: number; // days ago
    interviews?: { who: string; kind: string; at: number; scores?: number[]; rec?: string }[];
    notes?: string;
  };
  const cands: Cand[] = [
    // Senior ML Engineer, Aleppo
    { role: "role_senior_ml_aleppo", name: "Nadia Haroun", stage: "applied", applied: 3, source: "LinkedIn" },
    { role: "role_senior_ml_aleppo", name: "Majd Rahal", stage: "screening", applied: 14, stageChanged: 9, source: "Referral" },
    { role: "role_senior_ml_aleppo", name: "Reem Daher", stage: "interview", applied: 30, stageChanged: 12, source: "LinkedIn", notes: "Strong PyTorch background. Waiting on Sami's scorecard.",
      interviews: [
        { who: "karim_nasr", kind: "technical", at: 6, scores: [5, 4, 4, 4, 5], rec: "strong_yes" },
        { who: "sami_khoury", kind: "system_design", at: 3 },
      ] },
    { role: "role_senior_ml_aleppo", name: "Omar Shehadeh", stage: "interview", applied: 35, stageChanged: 10, source: "Job board", notes: "All scorecards in. Decision pending.",
      interviews: [
        { who: "karim_nasr", kind: "technical", at: 8, scores: [4, 4, 3, 4, 4], rec: "yes" },
        { who: "lina_shami", kind: "culture", at: 4, scores: [4, 3, 4, 5, 4], rec: "yes" },
      ] },
    { role: "role_senior_ml_aleppo", name: "Hiba Kanaan", stage: "offer", applied: 50, stageChanged: 2, source: "Referral", decision: "hire", decided: 2, outcomeSent: 1,
      interviews: [
        { who: "karim_nasr", kind: "technical", at: 12, scores: [5, 5, 4, 4, 5], rec: "strong_yes" },
        { who: "sami_khoury", kind: "system_design", at: 9, scores: [5, 4, 4, 4, 4], rec: "strong_yes" },
        { who: "zaher_zidan", kind: "founder", at: 5, scores: [4, 5, 5, 5, 5], rec: "strong_yes" },
      ] },
    // Backend Engineer, Cairo
    { role: "role_backend_cairo", name: "Amr Selim", stage: "applied", applied: 2, source: "Job board" },
    { role: "role_backend_cairo", name: "Marwa El-Sayed", stage: "screening", applied: 11, stageChanged: 6, source: "LinkedIn" },
    { role: "role_backend_cairo", name: "Khaled Mostafa", stage: "rejected", applied: 28, stageChanged: 12, source: "Referral", decision: "no_hire", decided: 12, notes: "Decided no-hire. Outcome has not been sent yet.",
      interviews: [
        { who: "karim_nasr", kind: "technical", at: 16, scores: [2, 3, 4, 3, 3], rec: "no" },
        { who: "youssef_hamdy", kind: "technical", at: 15, scores: [3, 2, 3, 3, 2], rec: "no" },
        { who: "mohamed_sarhan", kind: "system_design", at: 13, scores: [2, 2, 3, 3, 3], rec: "strong_no" },
      ] },
    { role: "role_backend_cairo", name: "Sherif Nabil", stage: "rejected", applied: 40, stageChanged: 28, source: "LinkedIn", decision: "no_hire", decided: 30, outcomeSent: 28,
      interviews: [{ who: "karim_nasr", kind: "technical", at: 32, scores: [2, 2, 3, 3, 2], rec: "no" }] },
    // Product Designer, Cairo
    { role: "role_product_designer", name: "Laila Zaki", stage: "applied", applied: 5, source: "Dribbble" },
    { role: "role_product_designer", name: "Hossam Adly", stage: "applied", applied: 1, source: "Job board" },
    { role: "role_product_designer", name: "Noha Fares", stage: "screening", applied: 20, stageChanged: 12, source: "Referral" },
    { role: "role_product_designer", name: "Tamer Wahba", stage: "interview", applied: 33, stageChanged: 7, source: "LinkedIn",
      interviews: [{ who: "abdulrahman_nasser", kind: "technical", at: 2 }] },
    // MLOps Engineer, Aleppo
    { role: "role_mlops_aleppo", name: "Ghassan Tabbaa", stage: "applied", applied: 4, source: "LinkedIn" },
    { role: "role_mlops_aleppo", name: "Salam Idlibi", stage: "screening", applied: 12, stageChanged: 5, source: "Referral" },
    { role: "role_mlops_aleppo", name: "Yazan Hariri", stage: "rejected", applied: 18, stageChanged: 9, source: "Job board", decision: "no_hire", decided: 9, outcomeSent: 9, notes: "Rejected at screening." },
    // Technical Recruiter, Cairo
    { role: "role_recruiter", name: "Menna Hassan", stage: "applied", applied: 6, source: "LinkedIn" },
    { role: "role_recruiter", name: "Ayman Rashad", stage: "screening", applied: 9, stageChanged: 3, source: "Referral" },
    // ML Engineer, Cairo (filled)
    { role: "role_ml_cairo_filled", name: "Nadine Wahdan", stage: "hired", applied: 110, stageChanged: 50, source: "Referral", decision: "hire", decided: 55, outcomeSent: 54, notes: "Started as ML Engineer.",
      interviews: [
        { who: "karim_nasr", kind: "technical", at: 70, scores: [4, 5, 4, 4, 5], rec: "strong_yes" },
        { who: "ahmed_ghonim", kind: "system_design", at: 65, scores: [4, 4, 5, 4, 4], rec: "yes" },
      ] },
    { role: "role_ml_cairo_filled", name: "Ibrahim Saad", stage: "rejected", applied: 100, stageChanged: 62, source: "Job board", decision: "no_hire", decided: 63, outcomeSent: 62,
      interviews: [{ who: "karim_nasr", kind: "technical", at: 66, scores: [3, 2, 3, 3, 3], rec: "no" }] },
  ];
  for (const c of cands) {
    const cand = await prisma.candidate.create({
      data: {
        roleId: c.role,
        name: c.name,
        email: `${slug(c.name).replace(/_/g, ".")}@mail.example`,
        phone: null,
        source: c.source ?? null,
        stage: c.stage,
        appliedAt: ago(c.applied),
        stageChangedAt: ago(c.stageChanged ?? c.applied),
        decision: c.decision ?? null,
        decidedAt: c.decided !== undefined ? ago(c.decided) : null,
        outcomeSentAt: c.outcomeSent !== undefined ? ago(c.outcomeSent) : null,
        notes: c.notes ?? null,
      },
    });
    for (const iv of c.interviews ?? []) {
      const interview = await prisma.interview.create({
        data: { candidateId: cand.id, interviewerId: E[iv.who], scheduledAt: ago(iv.at), kind: iv.kind },
      });
      if (iv.scores) {
        await prisma.scorecard.create({
          data: {
            interviewId: interview.id,
            recommendation: iv.rec ?? "yes",
            summary: pick(["Solid interview.", "Clear communicator, good fundamentals.", "Some gaps but coachable.", "Would raise the bar."]),
            submittedAt: ago(iv.at - 1),
            scores: {
              create: criteria.map(([name, weight], idx) => ({ criterionId: C[name], weight, score: iv.scores![idx] })),
            },
          },
        });
      }
    }
  }

  console.log("Checklists...");
  const hr = E.heba_mansour;
  const makeChecklist = async (who: string, kind: "onboarding" | "offboarding", anchor: Date, template: ChecklistTemplateItem[], doneUntil: Date) => {
    const s = specByKey[who];
    const managerId = s.manager ? E[s.manager] : hr;
    await prisma.checklist.create({
      data: {
        employeeId: E[who],
        kind,
        createdAt: addDays(anchor, -14),
        items: {
          create: template.map((t, idx) => {
            const due = addDays(anchor, t.dueOffsetDays);
            const ownerId = t.ownerRole === "hr" ? hr : t.ownerRole === "manager" ? managerId : E[who];
            const done = due.getTime() <= doneUntil.getTime();
            return { title: t.title, ownerId, dueDate: due, doneAt: done ? due : null, sortOrder: idx };
          }),
        },
      },
    });
  };
  await makeChecklist("kareem_abdelaziz", "onboarding", specByKey.kareem_abdelaziz.start, ONBOARDING_TEMPLATE, ago(10)); // 30-day check-in overdue
  await makeChecklist("nadine_wahdan", "onboarding", specByKey.nadine_wahdan.start, ONBOARDING_TEMPLATE, ago(18)); // profile + handbook overdue
  await makeChecklist("joud_mardini", "onboarding", specByKey.joud_mardini.start, ONBOARDING_TEMPLATE, ahead(1));
  await makeChecklist("rami_halabi", "offboarding", specByKey.rami_halabi.end!, OFFBOARDING_TEMPLATE, ago(0));
  await makeChecklist("ziad_fouad", "offboarding", specByKey.ziad_fouad.end!, OFFBOARDING_TEMPLATE, ahead(1));
  await makeChecklist("tala_ajlani", "offboarding", specByKey.tala_ajlani.end!, OFFBOARDING_TEMPLATE, ahead(1));

  console.log("Goals...");
  const q = Math.floor(T.getUTCMonth() / 3) + 1;
  const prevQ = q === 1 ? { year: THIS_YEAR - 1, quarter: 4 } : { year: THIS_YEAR, quarter: q - 1 };
  const GOAL_POOL: Record<Spec["team"], string[]> = {
    Engineering: ["Cut model training time by 30%", "Ship the evaluation harness", "Reduce p95 inference latency under 200ms", "Migrate feature store to the new pipeline", "Write runbooks for the top 5 alerts", "Raise unit test coverage on the core service to 80%", "Mentor one junior engineer through a full project", "Lead the retrieval quality working group"],
    Product: ["Ship the customer onboarding redesign", "Run 10 customer interviews and publish findings", "Define the Q+1 roadmap with engineering", "Reduce time-to-first-value to under one day"],
    People: ["Close the three engineering roles", "Launch the H2 review cycle on time", "Move HR records out of spreadsheets", "Publish the leave and remote policy"],
    Leadership: ["Close the seed extension", "Hire a Head of Design", "Set OKRs for next year", "Visit the Aleppo office"],
  };
  const noGoals = new Set(["nadine_wahdan", "joud_mardini", "kareem_abdelaziz", "dem_regner", "nizar_jabri", "dana_atassi", "rami_halabi"]);
  for (const s of current) {
    if (noGoals.has(key(s))) continue;
    const n = between(3, 5);
    const titles = [...GOAL_POOL[s.team]].sort(() => rand() - 0.5).slice(0, n);
    await prisma.goal.createMany({
      data: titles.map((title) => ({
        employeeId: E[key(s)],
        year: THIS_YEAR,
        quarter: q,
        title,
        status: pick(["not_started", "on_track", "on_track", "at_risk", "done"]),
      })),
    });
    if (rand() < 0.6) {
      const prev = [...GOAL_POOL[s.team]].sort(() => rand() - 0.5).slice(0, 3);
      await prisma.goal.createMany({
        data: prev.map((title) => ({ employeeId: E[key(s)], year: prevQ.year, quarter: prevQ.quarter, title, status: pick(["done", "done", "dropped"]) })),
      });
    }
  }

  console.log("1:1s...");
  const ones: { emp: string; mgr: string; daysAgo: number; notes: string; items: { title: string; owner: string; due?: number; done?: boolean }[] }[] = [
    { emp: "ahmed_ghonim", mgr: "karim_nasr", daysAgo: 21, notes: "Training pipeline is stable. Ahmed wants to lead the retrieval project next quarter.", items: [{ title: "Write a one-pager for the retrieval project", owner: "ahmed_ghonim", due: -10, done: true }, { title: "Confirm budget for extra GPUs", owner: "karim_nasr", due: -5, done: true }] },
    { emp: "ahmed_ghonim", mgr: "karim_nasr", daysAgo: 7, notes: "Discussed promotion timing. Agreed on senior-staff track for H1.", items: [{ title: "Draft promotion case", owner: "karim_nasr", due: 14 }] },
    { emp: "sami_khoury", mgr: "karim_nasr", daysAgo: 14, notes: "Sami is overloaded with interviews. Reduce to one per week.", items: [{ title: "Submit scorecard for Reem Daher", owner: "sami_khoury", due: -2 }] },
    { emp: "menna_mahmoud", mgr: "karim_nasr", daysAgo: 10, notes: "Wants more exposure to customers. Pair with product on the next discovery call.", items: [{ title: "Invite Menna to a customer call", owner: "karim_nasr", due: 7 }] },
    { emp: "dina_mansour", mgr: "abdulrahman_nasser", daysAgo: 5, notes: "Onboarding redesign is on track. Needs engineering estimate by Thursday.", items: [{ title: "Get estimate from Hagar", owner: "dina_mansour", due: 2 }] },
    { emp: "yara_qassem", mgr: "abdulrahman_nasser", daysAgo: 12, notes: "Interview findings are good. Push the write-up.", items: [{ title: "Publish interview findings", owner: "yara_qassem", due: -3, done: true }] },
    { emp: "karim_nasr", mgr: "zaher_zidan", daysAgo: 3, notes: "Hiring plan: two offers out by end of month. Aleppo internet allowance review.", items: [{ title: "Decide on Omar Shehadeh", owner: "karim_nasr", due: 3 }, { title: "Review internet allowance amounts", owner: "zaher_zidan", due: 10 }] },
  ];
  for (const o of ones) {
    await prisma.oneOnOne.create({
      data: {
        employeeId: E[o.emp],
        managerId: E[o.mgr],
        date: ago(o.daysAgo),
        notes: o.notes,
        actionItems: {
          create: o.items.map((it) => ({ title: it.title, ownerId: E[it.owner], dueDate: it.due !== undefined ? ahead(it.due) : null, doneAt: it.done ? ago(o.daysAgo - 2) : null })),
        },
      },
    });
  }

  console.log("Review cycles...");
  const h1 = await prisma.reviewCycle.create({
    data: { name: `${THIS_YEAR} H1`, year: THIS_YEAR, half: "H1", selfDueDate: utcDate(THIS_YEAR, 6, 30), managerDueDate: utcDate(THIS_YEAR, 7, 15), status: "closed" },
  });
  const h2 = await prisma.reviewCycle.create({
    data: { name: `${THIS_YEAR} H2`, year: THIS_YEAR, half: "H2", selfDueDate: utcDate(THIS_YEAR, 12, 15), managerDueDate: utcDate(THIS_YEAR + 1, 1, 15), status: "open" },
  });
  const ratingsFor = () => REVIEW_CRITERIA.map((criterion) => ({ criterion, rating: between(3, 5), comment: pick(["Consistently good.", "Strong this half.", "Room to grow here.", null]) }));
  const midYear = utcDate(THIS_YEAR, 6, 1);
  const inH1 = current.filter((s) => s.start.getTime() < midYear.getTime() && s.manager);
  for (const s of inH1) {
    const emp = E[key(s)];
    const mgr = E[s.manager!];
    await prisma.review.create({ data: { cycleId: h1.id, employeeId: emp, reviewerId: emp, kind: "self", status: "submitted", submittedAt: utcDate(THIS_YEAR, 6, 25), summary: "Self review for H1.", ratings: { create: ratingsFor() } } });
    await prisma.review.create({ data: { cycleId: h1.id, employeeId: emp, reviewerId: mgr, kind: "manager", status: "submitted", submittedAt: utcDate(THIS_YEAR, 7, 10), summary: "Manager review for H1.", ratings: { create: ratingsFor() } } });
  }
  // Peer feedback for a few in H1
  const peers: [string, string][] = [["ahmed_ghonim", "sami_khoury"], ["sami_khoury", "ahmed_ghonim"], ["dina_mansour", "hagar_lialy"], ["mohamed_sarhan", "bashar_hamwi"]];
  for (const [emp, peer] of peers) {
    await prisma.review.create({ data: { cycleId: h1.id, employeeId: E[emp], reviewerId: E[peer], kind: "peer", status: "submitted", submittedAt: utcDate(THIS_YEAR, 7, 5), summary: "Peer feedback.", ratings: { create: ratingsFor() } } });
  }
  // H2 in progress: some self reviews submitted, some drafts, some not started.
  const h2People = current.filter((s) => s.manager && !noGoals.has(key(s)));
  for (const [idx, s] of h2People.entries()) {
    const emp = E[key(s)];
    const mgr = E[s.manager!];
    if (idx % 3 === 0) {
      await prisma.review.create({ data: { cycleId: h2.id, employeeId: emp, reviewerId: emp, kind: "self", status: "submitted", submittedAt: ago(between(1, 10)), summary: "Self review for H2.", ratings: { create: ratingsFor() } } });
      if (idx % 6 === 0) {
        await prisma.review.create({ data: { cycleId: h2.id, employeeId: emp, reviewerId: mgr, kind: "manager", status: "draft", summary: null } });
      }
    } else if (idx % 3 === 1) {
      await prisma.review.create({ data: { cycleId: h2.id, employeeId: emp, reviewerId: emp, kind: "self", status: "draft", summary: "Draft notes..." } });
    }
  }

  console.log("Compensation...");
  const admin = E.zaher_zidan;
  const monthStart = startOfMonth(T);
  for (const s of SPECS) {
    const emp = E[key(s)];
    const records: { amount: number; effectiveDate: Date; reason: string }[] = [];
    for (const [date, amount, reason] of s.history ?? []) records.push({ amount, effectiveDate: date, reason });
    // Current amount: effective at the last change, or at hire if no history.
    const currentEffective = s.history && s.history.length ? addDays(utcDate(THIS_YEAR, 7, 1), 0) : s.start;
    records.push({ amount: s.salary, effectiveDate: currentEffective, reason: s.history?.length ? "annual_review" : "hire" });
    for (const r of records) {
      await prisma.salaryRecord.create({ data: { employeeId: emp, amount: r.amount, currency: currency(s), effectiveDate: r.effectiveDate, reason: r.reason, createdById: admin } });
    }
  }
  // Two changes effective this month, one next month (shows up on the payroll sheet).
  await prisma.salaryRecord.create({ data: { employeeId: E.ahmed_ghonim, amount: 165000, currency: "EGP", effectiveDate: monthStart, reason: "promotion", createdById: admin } });
  await prisma.salaryRecord.create({ data: { employeeId: E.rania_barakat, amount: 2300, currency: "USD", effectiveDate: monthStart, reason: "adjustment", createdById: admin } });
  await prisma.salaryRecord.create({ data: { employeeId: E.hagar_lialy, amount: 84000, currency: "EGP", effectiveDate: addDays(startOfMonth(addDays(monthStart, 40)), 0), reason: "annual_review", createdById: admin } });

  for (const s of current) {
    const emp = E[key(s)];
    const full = (s.type ?? "full_time") === "full_time";
    if (full) {
      await prisma.benefit.create({ data: { employeeId: emp, type: "medical_insurance", description: s.office === "cairo" ? "Private medical, family plan" : "Private medical, individual", startDate: addDays(s.start, 90), currency: currency(s), amount: s.office === "cairo" ? 3500 : 90 } });
    }
    if (s.office === "cairo" && full) {
      await prisma.benefit.create({ data: { employeeId: emp, type: "transport_allowance", description: "Monthly transport allowance", amount: 2500, currency: "EGP", startDate: s.start } });
    }
    if (s.office === "aleppo") {
      await prisma.benefit.create({ data: { employeeId: emp, type: "internet_allowance", description: "Home internet and power backup", amount: 40, currency: "USD", startDate: s.start } });
    }
    if (rand() < 0.3) {
      await prisma.benefit.create({ data: { employeeId: emp, type: "equipment", description: "Laptop upgrade", startDate: ago(between(30, 400)) } });
    }
  }
  await prisma.salaryAdvance.create({ data: { employeeId: E.youssef_hamdy, amount: 15000, currency: "EGP", date: ago(3), note: "Repay over 3 months" } });
  await prisma.salaryAdvance.create({ data: { employeeId: E.fadi_masri, amount: 400, currency: "USD", date: ago(1), note: "Repay next month" } });

  const counts = {
    employees: await prisma.employee.count(),
    offices: await prisma.office.count(),
    roles: await prisma.role.count(),
    candidates: await prisma.candidate.count(),
    leaveRequests: await prisma.leaveRequest.count(),
    contracts: await prisma.contract.count(),
    goals: await prisma.goal.count(),
    reviews: await prisma.review.count(),
    salaryRecords: await prisma.salaryRecord.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
