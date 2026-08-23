/** Platform owner — the only person who can authorize a new patio. */
export const DEVELOPER_EMAIL = "desarrollador@inspecta.mx";

export function isDeveloperEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === DEVELOPER_EMAIL;
}
