import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, evaluateBilling, GRACE_DAYS } from "./billing.ts";

test("active until period_end inclusive", () => {
  const snap = evaluateBilling({
    periodStart: "2026-07-23",
    periodEnd: "2026-08-23",
    today: "2026-08-23",
  });
  assert.equal(snap.status, "active");
  assert.equal(snap.needsPaywall, false);
  assert.equal(snap.canSkip, false);
  assert.equal(snap.canEnter, true);
});

test("day after period_end is due with 7 days of grace", () => {
  const snap = evaluateBilling({
    periodStart: "2026-07-22",
    periodEnd: "2026-08-22",
    today: "2026-08-23",
  });
  assert.equal(snap.status, "due");
  assert.equal(snap.needsPaywall, true);
  assert.equal(snap.canSkip, true);
  assert.equal(snap.canEnter, true);
  assert.equal(snap.daysLeftInGrace, GRACE_DAYS);
  assert.equal(snap.graceUntil, "2026-08-29");
});

test("last grace day still allows skip", () => {
  const periodEnd = "2026-08-22";
  const snap = evaluateBilling({
    periodStart: "2026-07-22",
    periodEnd,
    today: addDays(periodEnd, GRACE_DAYS),
  });
  assert.equal(snap.status, "due");
  assert.equal(snap.canSkip, true);
  assert.equal(snap.daysLeftInGrace, 1);
  assert.equal(snap.canEnter, true);
});

test("day 8 past due suspends the patio", () => {
  const snap = evaluateBilling({
    periodStart: "2026-07-22",
    periodEnd: "2026-08-22",
    today: "2026-08-30",
  });
  assert.equal(snap.status, "suspended");
  assert.equal(snap.canSkip, false);
  assert.equal(snap.canEnter, false);
  assert.equal(snap.needsPaywall, true);
  assert.equal(snap.daysLeftInGrace, 0);
});
