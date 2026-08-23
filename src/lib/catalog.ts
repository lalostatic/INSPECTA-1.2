export const APP_NAME = "INSPECTA";
export const APP_TAGLINE = "Sistema de contenedores";

export const NAVIERAS = [
  "Hapag-Lloyd", "MSC", "Maersk", "CMA CGM", "ONE", "Evergreen",
  "COSCO", "HMM", "PIL", "Yang Ming", "ZIM", "Textainer", "Seaco", "CAI", "Otra",
] as const;

export const SIZE_CODES = [
  "20DC", "40DC", "40HC", "45HC", "20RF", "40RF", "40RH",
  "20OT", "40OT", "20FR", "40FR", "20TK",
] as const;

export const CLASS_CODES = [
  { code: "C", label: "Dry / general (C)" },
  { code: "R", label: "Reefer (R)" },
  { code: "T", label: "Tanque (T)" },
  { code: "O", label: "Open top (O)" },
  { code: "F", label: "Flat rack (F)" },
] as const;

export const OWNERSHIP = [
  { code: "merchant", label: "Merchant" },
  { code: "carrier", label: "Carrier" },
  { code: "unknown", label: "No indica" },
] as const;

export const INSPECTION_TYPES = [
  "Inspección Express", "Inspección Completa", "Gate-in", "Gate-out",
  "On-hire", "Off-hire", "Pre-trip (PTI)", "In-service",
] as const;

export const LOCATIONS = [
  "Inspección en Bahía", "Patio", "Muelle", "Taller M&R", "Rampa", "Stack", "Gate", "Cerlan",
] as const;

export const DAMAGES = [
  "RESTOS DE CARGA", "SUCIO", "ABOLLADO", "AGUJERO", "OXIDADO", "CORTE",
  "FALTANTE", "GOLPE", "CALCAS", "CINTAS EN PANEL", "PISO DAÑADO",
  "GOMA DAÑADA", "LONA / RUBEN", "LLAVES", "SIN ETIQUETA",
] as const;

export const REPAIRS = [
  "BANDA (RESTOS DE CARGA)",
  "LIMPIEZA (SE BARRIÓ PISO COMPLETO)",
  "ENDEREZAR PANEL",
  "RELIMAR CINTAS EN PANEL",
  "RELIMAR LLAVES",
  "CAMBIO DE GOMA DE PUERTA",
  "PARCHE DE ACERO",
  "PINTURA / ACONDICIONADO",
  "SIN REPARACIÓN — SOLO REGISTRO",
] as const;

export const TREATMENTS = ["Acond.", "Pintura táctica", "Lavado", "Solo registro"] as const;
export const MATERIAL_UNITS = ["LTS", "PZ", "KG", "M", "GAL"] as const;

export type Role = "admin" | "office" | "inspector" | "repair" | "painter" | "supervisor";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  office: "Oficina",
  inspector: "Inspector",
  repair: "Taller M&R",
  painter: "Pintura",
  supervisor: "Supervisor",
};

export const ALL_ROLES: Role[] = ["admin", "office", "inspector", "repair", "painter", "supervisor"];

export function asRole(r: string): Role {
  if (r === "office" || r === "admin" || r === "inspector" || r === "repair" || r === "painter" || r === "supervisor") {
    return r;
  }
  return "inspector";
}

export type ModuleKey = "inspeccion" | "mr" | "pintura";

export const MODULES: {
  key: ModuleKey;
  label: string;
  short: string;
  blurb: string;
}[] = [
  {
    key: "inspeccion",
    label: "Inspección de patio",
    short: "Inspección",
    blurb: "Número de unidad, mapa y foto. El daño es opcional.",
  },
  {
    key: "mr",
    label: "Reporte de trabajo M&R",
    short: "M&R",
    blurb: "Fecha, contenedor y trabajo realizado.",
  },
  {
    key: "pintura",
    label: "Entrada de almacén / pintura",
    short: "Pintura",
    blurb: "Folio, material y unidades acondicionadas.",
  },
];

export function defaultModules(): Record<ModuleKey, boolean> {
  return { inspeccion: true, mr: true, pintura: true };
}
