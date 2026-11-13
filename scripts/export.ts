// Dumps every table to exports/<Table>.csv and exports/all.json.
// Dates become ISO strings; ids and foreign keys are kept as-is so the data
// can be re-linked in any other tool.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const outDir = path.resolve(import.meta.dirname, "..", "exports");

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvCell(r[c])).join(","));
  return lines.join("\n") + "\n";
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const all: Record<string, unknown[]> = {};
  for (const model of Prisma.dmmf.datamodel.models) {
    const delegateName = model.name.charAt(0).toLowerCase() + model.name.slice(1);
    const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<Record<string, unknown>[]> }>)[delegateName];
    const rows = await delegate.findMany();
    const columns = model.fields.filter((f) => f.kind !== "object").map((f) => f.name);
    writeFileSync(path.join(outDir, `${model.name}.csv`), toCsv(rows, columns));
    all[model.name] = rows;
    console.log(`${model.name}: ${rows.length} rows`);
  }
  writeFileSync(path.join(outDir, "all.json"), JSON.stringify(all, null, 2));
  console.log(`\nWritten to ${outDir}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
