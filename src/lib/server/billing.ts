import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  BILLING_CURRENCY,
  MONTHLY_CENTAVOS,
  addMonths,
  cardBrand,
  digitsOnly,
  evaluateBilling,
  expiryValid,
  luhnOk,
  nextPeriodEnd,
  type BillingSnapshot,
} from "@/lib/billing";
import { getSql } from "@/lib/db";
import { todayISO } from "@/lib/utils";

type BillingRow = {
  period_start: string | Date | null;
  period_end: string | Date | null;
  last_paid_at: string | Date | null;
  monthly_amount_centavos: number;
  billing_currency: string;
};

function asIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asDay(value: string | Date | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function stampNewOrgBilling(orgId: string, periodEnd?: string) {
  const sql = await getSql();
  const today = todayISO();
  const end = periodEnd ?? addMonths(today, 1);
  const start = addMonths(end, -1);
  await sql`
    update organizations
    set period_start = coalesce(period_start, ${start}),
        period_end = coalesce(period_end, ${end}),
        monthly_amount_centavos = coalesce(monthly_amount_centavos, ${MONTHLY_CENTAVOS}),
        billing_currency = coalesce(billing_currency, ${BILLING_CURRENCY})
    where id = ${orgId}
  `;
}

export async function setOrgPeriod(orgId: string, periodEnd: string) {
  const sql = await getSql();
  const start = addMonths(periodEnd, -1);
  await sql`
    update organizations
    set period_start = ${start},
        period_end = ${periodEnd}
    where id = ${orgId} and period_end is null
  `;
}

export async function billingForOrg(orgId: string): Promise<BillingSnapshot> {
  const sql = await getSql();
  const today = todayISO();
  const rows = await sql<BillingRow>`
    select period_start, period_end, last_paid_at, monthly_amount_centavos, billing_currency
    from organizations where id = ${orgId} limit 1
  `;
  const row = rows[0];
  if (!row) {
    return evaluateBilling({ periodStart: today, periodEnd: addMonths(today, 1), today });
  }
  if (!row.period_end) {
    await stampNewOrgBilling(orgId);
    return evaluateBilling({
      periodStart: today,
      periodEnd: addMonths(today, 1),
      today,
      amountCentavos: Number(row.monthly_amount_centavos) || MONTHLY_CENTAVOS,
      currency: row.billing_currency || BILLING_CURRENCY,
      lastPaidAt: asIso(row.last_paid_at),
    });
  }
  const periodEnd = asDay(row.period_end, addMonths(today, 1));
  const periodStart = asDay(row.period_start, addMonths(periodEnd, -1));
  return evaluateBilling({
    periodStart,
    periodEnd,
    today,
    amountCentavos: Number(row.monthly_amount_centavos) || MONTHLY_CENTAVOS,
    currency: row.billing_currency || BILLING_CURRENCY,
    lastPaidAt: asIso(row.last_paid_at),
  });
}

export async function assertOrgNotSuspended(orgId: string) {
  const billing = await billingForOrg(orgId);
  if (billing.status === "suspended") {
    throw new Error("Su patio está suspendido por falta de pago. Regularice la mensualidad.");
  }
}

const payIn = z.object({
  holder: z.string().min(3).max(80),
  number: z.string().min(13).max(24),
  expiry: z.string().min(4).max(7),
  cvc: z.string().min(3).max(4),
});

export const payMonthly = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => payIn.parse(input))
  .handler(async ({ context, data }): Promise<BillingSnapshot> => {
    const sql = await getSql();
    const members = await sql<{ org_id: string }>`
      select org_id from org_members where user_id = ${context.userId} order by created_at limit 1
    `;
    const orgId = members[0]?.org_id;
    if (!orgId) throw new Error("Sin empresa asignada");

    const number = digitsOnly(data.number);
    if (!luhnOk(number)) throw new Error("Número de tarjeta no válido");
    if (!expiryValid(data.expiry, todayISO())) throw new Error("La tarjeta está vencida");
    const cvc = digitsOnly(data.cvc);
    if (cvc.length < 3) throw new Error("CVC no válido");

    const current = await billingForOrg(orgId);
    const today = todayISO();
    const newEnd = nextPeriodEnd(current.periodEnd, today, current.status === "suspended");
    const newStart = addMonths(newEnd, -1);
    const last4 = number.slice(-4);
    const brand = cardBrand(number);
    const now = new Date().toISOString();

    await sql`
      insert into org_payments (
        id, org_id, kind, amount_centavos, currency, last4, brand, period_end_after, created_by
      ) values (
        ${crypto.randomUUID()}, ${orgId}, ${"paid"}, ${current.amountCentavos},
        ${current.currency}, ${last4}, ${brand}, ${newEnd}, ${context.userId}
      )
    `;
    await sql`
      update organizations
      set period_start = ${newStart},
          period_end = ${newEnd},
          last_paid_at = ${now}
      where id = ${orgId}
    `;
    return billingForOrg(orgId);
  });
