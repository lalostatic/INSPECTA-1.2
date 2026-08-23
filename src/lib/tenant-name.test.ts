import assert from "node:assert/strict";
import { test } from "node:test";
import { schemaNameFromOrgId, tenantTables } from "./tenant-name.ts";

test("each company gets a distinct schema from its id", () => {
  const cerlan = schemaNameFromOrgId("4220ea85-aa98-4ac6-a668-fc81d7306bcc");
  const contri = schemaNameFromOrgId("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  assert.equal(cerlan, "t_4220ea85aa984ac6a668fc81d7306bcc");
  assert.notEqual(cerlan, contri);
  assert.match(cerlan, /^t_[a-f0-9]{32}$/);
});

test("qualified tables stay inside that schema", () => {
  const schema = schemaNameFromOrgId("4220ea85-aa98-4ac6-a668-fc81d7306bcc");
  const T = tenantTables(schema);
  assert.equal(T.inspections, `"${schema}".inspections`);
  assert.equal(T.work_reports.startsWith(`"${schema}".`), true);
});

test("rejects a non-uuid org id", () => {
  assert.throws(() => schemaNameFromOrgId("cerlan"), /no válido/);
});
