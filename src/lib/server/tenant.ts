import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { ALL_ROLES, asRole, defaultModules, type ModuleKey, type Role } from "@/lib/catalog";
import { getSql } from "@/lib/db";
import {
  isCompanyDomain,
  parseEmail,
  roleFromLocal,
} from "@/lib/email-domain";
import { isDeveloperEmail } from "@/lib/developer";
import { createCredentialUser } from "@/lib/server/accounts";
import { assertOrgNotSuspended, billingForOrg } from "@/lib/server/billing";
import { ensureOrgTenant, schemaNameFromOrgId } from "@/lib/server/tenant-schema";
import type { Membership, SessionPayload, TeamMember } from "@/lib/types";

type OrgRow = {
  org_id: string;
  name: string;
  depot: string;
  city: string;
  slug: string;
  invite_code: string;
  email_domain: string | null;
  authorized: boolean;
  db_schema: string | null;
  user_id: string;
  display_name: string;
  role: string;
};

function mapModules(rows: { module_key: string; enabled: boolean }[]): Record<ModuleKey, boolean> {
  const mods = defaultModules();
  for (const r of rows) {
    if (r.module_key === "inspeccion" || r.module_key === "mr" || r.module_key === "pintura") {
      mods[r.module_key] = r.enabled;
    }
  }
  return mods;
}

async function userRecord(userId: string): Promise<{ email: string; name: string } | null> {
  const sql = await getSql();
  const rows = await sql<{ email: string; name: string }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  return rows[0] ?? null;
}

async function findMembership(userId: string): Promise<Membership | null> {
  const sql = await getSql();
  const rows = await sql<OrgRow>`
    select m.org_id, o.name, o.depot, o.city, o.slug, o.invite_code, o.email_domain, o.authorized,
           o.db_schema, m.user_id, m.display_name, m.role
    from org_members m
    join organizations o on o.id = m.org_id
    where m.user_id = ${userId}
    order by m.created_at
    limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  const mods = await sql<{ module_key: string; enabled: boolean }>`
    select module_key, enabled from org_modules where org_id = ${r.org_id}
  `;
  return {
    orgId: r.org_id,
    orgName: r.name,
    depot: r.depot,
    city: r.city,
    slug: r.slug,
    inviteCode: r.invite_code,
    emailDomain: r.email_domain ?? "",
    authorized: Boolean(r.authorized),
    dbSchema: r.db_schema || schemaNameFromOrgId(r.org_id),
    userId: r.user_id,
    displayName: r.display_name,
    role: asRole(r.role),
    modules: mapModules(mods),
  };
}

async function addMember(orgId: string, userId: string, displayName: string, role: Role) {
  const sql = await getSql();
  await sql`
    insert into org_members (org_id, user_id, display_name, role)
    values (${orgId}, ${userId}, ${displayName}, ${role})
    on conflict (org_id, user_id) do nothing
  `;
}

async function findOrgByDomain(domain: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from organizations where email_domain = ${domain} limit 1
  `;
  return rows[0]?.id ?? null;
}

/**
 * Join an already-authorized patio by company email.
 * Never opens a new company — that is the developer's job.
 */
async function attachByEmailDomain(userId: string): Promise<Membership | null> {
  const user = await userRecord(userId);
  if (!user?.email) return null;
  const parsed = parseEmail(user.email);
  if (!parsed || !isCompanyDomain(parsed.domain)) return null;

  const sql = await getSql();
  const already = await sql<{ c: number }>`select count(*)::int as c from org_members where user_id = ${userId}`;
  if ((already[0]?.c ?? 0) > 0) return findMembership(userId);

  const orgId = await findOrgByDomain(parsed.domain);
  if (!orgId) return null;
  const auth = await sql<{ authorized: boolean }>`
    select authorized from organizations where id = ${orgId} limit 1
  `;
  if (!auth[0]?.authorized) return null;

  const inferred = roleFromLocal(parsed.local) ?? "inspector";
  const displayName = user.name?.trim() || parsed.local;
  await addMember(orgId, userId, displayName, inferred);
  return findMembership(userId);
}

async function loadMembership(userId: string): Promise<Membership | null> {
  const existing = await findMembership(userId);
  if (existing) return existing;
  return attachByEmailDomain(userId);
}

export async function requireMembership(userId: string): Promise<Membership> {
  const m = await loadMembership(userId);
  if (!m) throw new Error("Sin empresa asignada");
  if (!m.authorized) throw new Error("Este patio aún no está autorizado por el desarrollador.");
  const dbSchema = await ensureOrgTenant(m.orgId);
  await assertOrgNotSuspended(m.orgId);
  return { ...m, dbSchema };
}

export const getSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SessionPayload> => {
    const user = await userRecord(context.userId);
    const membership = await loadMembership(context.userId);
    if (membership?.authorized) {
      membership.dbSchema = await ensureOrgTenant(membership.orgId);
    }
    const billing = membership ? await billingForOrg(membership.orgId) : null;
    return {
      userId: context.userId,
      email: user?.email ?? "",
      developer: isDeveloperEmail(user?.email),
      membership,
      billing,
    };
  });

const createIn = z.object({
  name: z.string().min(2).max(80),
  depot: z.string().max(80).default(""),
  city: z.string().max(80).default(""),
  displayName: z.string().min(2).max(80),
});

export const createOrg = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => createIn.parse(input))
  .handler(async ({ context }) => {
    const existing = await loadMembership(context.userId);
    if (existing) return existing;
    throw new Error("Las empresas nuevas las autoriza el desarrollador de INSPECTA.");
  });

const joinIn = z.object({
  code: z.string().min(4).max(12),
  displayName: z.string().min(2).max(80),
});

export const joinOrg = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => joinIn.parse(input))
  .handler(async ({ context, data }) => {
    const existing = await loadMembership(context.userId);
    if (existing) return existing;
    const sql = await getSql();
    const code = data.code.trim().toUpperCase();
    const orgs = await sql<{ id: string }>`
      select id from organizations where invite_code = ${code} limit 1
    `;
    const org = orgs[0];
    if (!org) throw new Error("Código de empresa no válido");
    const flag = await sql<{ authorized: boolean }>`
      select authorized from organizations where id = ${org.id} limit 1
    `;
    if (!flag[0]?.authorized) throw new Error("Ese patio aún no está autorizado.");
    await sql`
      insert into org_members (org_id, user_id, display_name, role)
      values (${org.id}, ${context.userId}, ${data.displayName}, ${"inspector"})
      on conflict (org_id, user_id) do nothing
    `;
    const joined = await findMembership(context.userId);
    if (!joined) throw new Error("No se pudo unir a la empresa");
    return joined;
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TeamMember[]> => {
    const m = await requireMembership(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      display_name: string;
      role: string;
      created_at: string;
      email: string | null;
    }>`
      select m.user_id, m.display_name, m.role, m.created_at, coalesce(u.email, '') as email
      from org_members m
      left join "user" u on u.id = m.user_id
      where m.org_id = ${m.orgId}
      order by m.created_at
    `;
    return rows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      email: r.email ?? "",
      role: asRole(r.role),
      createdAt: r.created_at,
    }));
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ userId: z.string(), role: z.enum(ALL_ROLES as [Role, ...Role[]]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (m.role !== "admin") throw new Error("Solo el administrador cambia roles");
    const sql = await getSql();
    await sql`
      update org_members set role = ${data.role}
      where org_id = ${m.orgId} and user_id = ${data.userId}
    `;
    return { ok: true };
  });

export const setModules = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        inspeccion: z.boolean(),
        mr: z.boolean(),
        pintura: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (m.role !== "admin") throw new Error("Solo el administrador configura módulos");
    const sql = await getSql();
    for (const key of ["inspeccion", "mr", "pintura"] as const) {
      await sql`
        insert into org_modules (org_id, module_key, enabled)
        values (${m.orgId}, ${key}, ${data[key]})
        on conflict (org_id, module_key) do update set enabled = ${data[key]}
      `;
    }
    return { ok: true };
  });

export const updateOrg = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ name: z.string().min(2).max(80), depot: z.string().max(80), city: z.string().max(80) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (m.role !== "admin") throw new Error("Solo el administrador edita la empresa");
    const sql = await getSql();
    await sql`
      update organizations set name = ${data.name}, depot = ${data.depot}, city = ${data.city}
      where id = ${m.orgId}
    `;
    return { ok: true };
  });

const teamUserIn = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(80),
  role: z.enum(ALL_ROLES as [Role, ...Role[]]),
});

export const addTeamUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => teamUserIn.parse(input))
  .handler(async ({ context, data }) => {
    const m = await requireMembership(context.userId);
    if (m.role !== "admin") throw new Error("Solo el administrador da de alta personas");
    const email = data.email.trim().toLowerCase();
    const parsed = parseEmail(email);
    if (!parsed) throw new Error("Correo no válido");
    if (m.emailDomain && parsed.domain !== m.emailDomain) {
      throw new Error(`El correo debe ser @${m.emailDomain}`);
    }
    const { id } = await createCredentialUser({
      name: data.name,
      email,
      password: data.password,
    });
    const sql = await getSql();
    const other = await sql<{ org_id: string }>`
      select org_id from org_members where user_id = ${id} and org_id <> ${m.orgId} limit 1
    `;
    if (other[0]) throw new Error("Ese correo ya pertenece a otro patio");
    await sql`
      insert into org_members (org_id, user_id, display_name, role)
      values (${m.orgId}, ${id}, ${data.name}, ${data.role})
      on conflict (org_id, user_id) do update
        set display_name = excluded.display_name, role = excluded.role
    `;
    return { ok: true };
  });
