import type { Role } from "./catalog";

/** Shared demo password. Not shown on the login screen. */
export const DEMO_PASSWORD = "Muelle2026";

export type DemoAccount = {
  local: string;
  name: string;
  role: Role;
  label: string;
};

export type DemoOrg = {
  name: string;
  depot: string;
  city: string;
  slug: string;
  domain: string;
  inviteCode: string;
  sample: "cerlan" | "contri";
  billing: "active" | "due";
  accounts: DemoAccount[];
};

export const DEMO_ORGS: DemoOrg[] = [
  {
    name: "Cerlan",
    depot: "Bahía Principal",
    city: "Veracruz",
    slug: "cerlan",
    domain: "cerlan.mx",
    inviteCode: "CERLAN",
    sample: "cerlan",
    billing: "active",
    accounts: [
      { local: "admin", name: "María Solís", role: "admin", label: "Administrador" },
      { local: "oficina", name: "Roberto Cruz", role: "office", label: "Oficina" },
      { local: "inspector", name: "Luis Mora", role: "inspector", label: "Inspector" },
      { local: "taller", name: "Elena Rivas", role: "repair", label: "Taller M&R" },
      { local: "pintura", name: "Eduardo", role: "painter", label: "Pintura" },
    ],
  },
  {
    name: "Contri",
    depot: "Patio Norte",
    city: "Manzanillo",
    slug: "contri",
    domain: "contri.mx",
    inviteCode: "CONTRI",
    sample: "contri",
    billing: "due",
    accounts: [
      { local: "admin", name: "Ana Herrera", role: "admin", label: "Administrador" },
      { local: "oficina", name: "Pablo Méndez", role: "office", label: "Oficina" },
      { local: "inspector", name: "Sofía Ruiz", role: "inspector", label: "Inspector" },
      { local: "taller", name: "Diego Lara", role: "repair", label: "Taller M&R" },
      { local: "pintura", name: "Carmen Ortiz", role: "painter", label: "Pintura" },
    ],
  },
];

export function demoEmail(local: string, domain: string) {
  return `${local}@${domain}`;
}
