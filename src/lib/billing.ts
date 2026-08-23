export const GRACE_DAYS = 7;
export const MONTHLY_CENTAVOS = 199_000;
export const BILLING_CURRENCY = "MXN";
export const SKIP_PREFIX = "inspecta.billing.skip:";

export type BillingStatus = "active" | "due" | "suspended";

export type BillingSnapshot = {
  status: BillingStatus;
  periodStart: string;
  periodEnd: string;
  graceUntil: string;
  daysPastDue: number;
  daysLeftInGrace: number;
  amountCentavos: number;
  currency: string;
  canSkip: boolean;
  canEnter: boolean;
  needsPaywall: boolean;
  lastPaidAt: string | null;
};

function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = parseDay(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDay(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseDay(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return formatDay(d);
}

export function diffDays(from: string, to: string): number {
  const a = parseDay(from).getTime();
  const b = parseDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function evaluateBilling(opts: {
  periodStart: string;
  periodEnd: string;
  today: string;
  amountCentavos?: number;
  currency?: string;
  lastPaidAt?: string | null;
}): BillingSnapshot {
  const periodEnd = opts.periodEnd.slice(0, 10);
  const periodStart = opts.periodStart.slice(0, 10);
  const today = opts.today.slice(0, 10);
  const graceUntil = addDays(periodEnd, GRACE_DAYS);
  const amountCentavos = opts.amountCentavos ?? MONTHLY_CENTAVOS;
  const currency = opts.currency ?? BILLING_CURRENCY;
  const lastPaidAt = opts.lastPaidAt ?? null;

  if (today <= periodEnd) {
    return {
      status: "active",
      periodStart,
      periodEnd,
      graceUntil,
      daysPastDue: 0,
      daysLeftInGrace: GRACE_DAYS,
      amountCentavos,
      currency,
      canSkip: false,
      canEnter: true,
      needsPaywall: false,
      lastPaidAt,
    };
  }

  const daysPastDue = diffDays(periodEnd, today);
  if (today <= graceUntil) {
    return {
      status: "due",
      periodStart,
      periodEnd,
      graceUntil,
      daysPastDue,
      daysLeftInGrace: Math.max(1, diffDays(today, graceUntil) + 1),
      amountCentavos,
      currency,
      canSkip: true,
      canEnter: true,
      needsPaywall: true,
      lastPaidAt,
    };
  }

  return {
    status: "suspended",
    periodStart,
    periodEnd,
    graceUntil,
    daysPastDue,
    daysLeftInGrace: 0,
    amountCentavos,
    currency,
    canSkip: false,
    canEnter: false,
    needsPaywall: true,
    lastPaidAt,
  };
}

export function nextPeriodEnd(periodEnd: string, today: string, suspended: boolean): string {
  if (suspended) return addMonths(today, 1);
  return addMonths(periodEnd.slice(0, 10), 1);
}

export function formatMoney(centavos: number, currency = BILLING_CURRENCY): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(centavos / 100);
}

export function skipStorageKey(orgId: string, periodEnd: string, today?: string): string {
  const day = (today ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  return `${SKIP_PREFIX}${orgId}:${periodEnd.slice(0, 10)}:${day}`;
}

export function clearBillingSkip() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SKIP_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* storage blocked */
  }
}

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function luhnOk(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(digits: string): string {
  if (digits.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return "card";
}

export function parseExpiry(raw: string): { month: number; year: number } | null {
  const m = raw.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

export function expiryValid(raw: string, today: string): boolean {
  const parsed = parseExpiry(raw);
  if (!parsed) return false;
  const [y, mo] = today.slice(0, 10).split("-").map(Number);
  const nowYm = (y ?? 0) * 12 + (mo ?? 1);
  const cardYm = parsed.year * 12 + parsed.month;
  return cardYm >= nowYm;
}

export function formatCardNumber(raw: string): string {
  return digitsOnly(raw).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

export function formatExpiryInput(raw: string): string {
  const d = digitsOnly(raw).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
