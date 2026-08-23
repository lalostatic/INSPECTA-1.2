import type { Role } from "./catalog";

/** Consumer inboxes never map to a patio — those people create or join by code. */
const PUBLIC_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "gmx.com",
  "mail.com",
  "inspecta.mx",
]);

const LOCAL_ROLE: Record<string, Role> = {
  admin: "admin",
  administrador: "admin",
  oficina: "office",
  office: "office",
  inspector: "inspector",
  taller: "repair",
  repair: "repair",
  mr: "repair",
  pintura: "painter",
  painter: "painter",
  almacen: "painter",
  supervisor: "supervisor",
};

export function parseEmail(raw: string | null | undefined): { local: string; domain: string } | null {
  const email = (raw ?? "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at).trim();
  const domain = email.slice(at + 1).trim();
  if (!local || !domain || !domain.includes(".")) return null;
  return { local, domain };
}

export function isCompanyDomain(domain: string): boolean {
  return Boolean(domain) && !PUBLIC_DOMAINS.has(domain.toLowerCase());
}

export function roleFromLocal(local: string): Role | null {
  const key = local.split("+")[0]?.split(".")[0] ?? local;
  return LOCAL_ROLE[key] ?? null;
}

export function orgNameFromDomain(domain: string): string {
  const head = domain.split(".")[0] ?? domain;
  if (!head) return "Patio";
  return head.charAt(0).toUpperCase() + head.slice(1);
}

export function slugFromDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "patio";
}
