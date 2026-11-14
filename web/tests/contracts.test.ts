import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONTRACT_FILES } from "@/lib/contracts";

const DIR = path.join(__dirname, "..", "data");

describe("web/data matches the data contract", () => {
  for (const [file, schema] of Object.entries(CONTRACT_FILES)) {
    const p = path.join(DIR, file);
    it.skipIf(!fs.existsSync(p))(`${file} validates`, () => {
      const r = schema.safeParse(JSON.parse(fs.readFileSync(p, "utf8")));
      expect(r.success, r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3))).toBe(true);
    });
  }
});
