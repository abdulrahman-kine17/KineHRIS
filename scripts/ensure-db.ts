// Runs before `next dev`. Creates and seeds the SQLite database the first time,
// so a fresh clone starts with a single command.

import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dbPath = path.join(root, "prisma", "dev.db");
const clientPath = path.join(root, "node_modules", ".prisma", "client", "index.js");

const run = (cmd: string) => execSync(cmd, { cwd: root, stdio: "inherit" });

if (!existsSync(clientPath)) {
  console.log("Generating the database client...");
  run("npx prisma generate");
}

if (!existsSync(dbPath)) {
  console.log("No database found. Creating prisma/dev.db and loading sample data...");
  run("npx prisma db push --skip-generate");
  run("npx prisma db seed");
  console.log("Database ready.");
}
