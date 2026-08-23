import type { ModuleKey, Role } from "./catalog";

export function canCreateInspection(role: Role) {
  return role === "inspector" || role === "admin";
}

export function canViewArchive(role: Role) {
  return role === "office" || role === "admin" || role === "repair" || role === "supervisor" || role === "painter";
}

export function canWorkMr(role: Role) {
  return role === "repair" || role === "admin" || role === "supervisor";
}

export function canWorkPaint(role: Role) {
  return role === "painter" || role === "admin" || role === "supervisor";
}

export function canManageUsers(role: Role) {
  return role === "admin";
}

export function canSeeModule(role: Role, module: ModuleKey) {
  if (role === "admin" || role === "office") return true;
  if (module === "inspeccion") return role === "inspector" || role === "supervisor";
  if (module === "mr") return role === "repair" || role === "supervisor";
  if (module === "pintura") return role === "painter" || role === "supervisor";
  return false;
}
