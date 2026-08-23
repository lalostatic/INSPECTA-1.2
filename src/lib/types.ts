import type { BillingSnapshot } from "./billing";
import type { ModuleKey, Role } from "./catalog";

export type { BillingSnapshot };

export type Membership = {
  orgId: string;
  orgName: string;
  depot: string;
  city: string;
  slug: string;
  inviteCode: string;
  emailDomain: string;
  authorized: boolean;
  dbSchema: string;
  userId: string;
  displayName: string;
  role: Role;
  modules: Record<ModuleKey, boolean>;
};

export type SessionPayload = {
  userId: string;
  email: string;
  developer: boolean;
  membership: Membership | null;
  billing: BillingSnapshot | null;
};

export type InspectionListItem = {
  id: string;
  containerNo: string;
  naviera: string;
  sizeCode: string;
  classCode: string;
  ownership: string;
  inspectorName: string;
  status: string;
  inspectedAt: string;
  findingCount: number;
  primaryDamage: string;
  missingLabel: boolean;
};

export type Finding = {
  id: string;
  pointId: string;
  side: string;
  component: string;
  damage: string;
  repair: string;
  locCode: string;
  photos: { id: string; dataUrl: string; caption: string }[];
};


export type InspectionDetail = InspectionListItem & {
  inspectionType: string;
  locationName: string;
  workOrder: string;
  notes: string;
  findings: Finding[];
};

export type WorkReportListItem = {
  id: string;
  reportDate: string;
  area: string;
  technicians: string;
  supervisor: string;
  status: string;
  lineCount: number;
  createdAt: string;
};

export type WorkReportLine = {
  id: string;
  seq: number;
  containerNo: string;
  classCode: string;
  sizeCode: string;
  naviera: string;
  description: string;
  locCode: string;
  unknownOwnership: boolean;
  missingLabel: boolean;
};

export type WorkReportDetail = WorkReportListItem & {
  notes: string;
  lines: WorkReportLine[];
};

export type WarehouseListItem = {
  id: string;
  folio: string;
  entryDate: string;
  locationName: string;
  receivedBy: string;
  unitCount: number;
  createdAt: string;
};

export type WarehouseMaterial = {
  id: string;
  qty: number;
  unit: string;
  code: string;
  article: string;
};

export type WarehouseUnit = {
  id: string;
  containerNo: string;
  unitCode: string;
  sizeCode: string;
  naviera: string;
  treatment: string;
};

export type WarehouseDetail = WarehouseListItem & {
  receivedFrom: string;
  invoiceRef: string;
  notes: string;
  materials: WarehouseMaterial[];
  units: WarehouseUnit[];
};

export type UnitEvent = {
  kind: "inspeccion" | "mr" | "pintura";
  at: string;
  title: string;
  body: string;
  id: string;
};

export type YardStats = {
  inspectionsToday: number;
  mrToday: number;
  paintToday: number;
  unknownOwnership: number;
  openMr: number;
};

export type TeamMember = {
  userId: string;
  displayName: string;
  email: string;
  role: Role;
  createdAt: string;
};
