#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contract = path.join(root, "database/contract/schema.yaml");
if (!fs.existsSync(contract)) {
  console.error("database/contract/schema.yaml missing; run materialize_phase1_contracts first");
  process.exit(1);
}
console.log("Documents database contract is materialized at database/contract/schema.yaml");
