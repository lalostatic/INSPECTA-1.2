import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { ALL_ROLES, MODULES, asRole, defaultModules, type ModuleKey, type Role } from "@/lib/catalog";
import { getSql } from "@/lib/db";
import {
  isCompanyDomain,
  orgNameFromDomain,
  parseEmail,
  roleFromLocal,
  slugFromDomain,
} from "@/lib/email-domain";
import { assertOrgNotSuspended, billingForOrg, stampNewOrgBilling } from "@/lib/server/billing";
import type { Membership, SessionPayload, TeamMember } from "@/lib/types";
import { inviteCode, slugify } from "@/lib/utils";

type OrgRow = {
  org_id: string;
  name: string;
  depot: string;
  city: string;
  slug: string;
  invite_code: string;
  email_domain: string | null;
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
    select m.org_id, o.name, o.depot, o.city, o.slug, o.invite_code, o.email_domain,
           m.user_id, m.display_name, m.role
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
    userId: r.user_id,
    displayName: r.display_name,
    role: asRole(r.role),
    modules: mapModules(mods),
  };
}

async function insertDefaultModules(orgId: string) {
  const sql = await getSql();
  for (const mod of MODULES) {
    await sql`
      insert into org_modules (org_id, module_key, enabled)
      values (${orgId}, ${mod.key}, ${true})
      on conflict (org_id, module_key) do nothing
    `;
  }
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

async function createOrgForDomain(opts: {
  domain: string;
  userId: string;
}): Promise<string> {
  const sql = await getSql();
  const existing = await findOrgByDomain(opts.domain);
  if (existing) return existing;

  const id = crypto.randomUUID();
  let slug = slugFromDomain(opts.domain);
  const taken = await sql<{ c: number }>`select count(*)::int as c from organizations where slug = ${slug}`;
  if ((taken[0]?.c ?? 0) > 0) slug = `${slug}-${id.slice(0, 4)}`;
  const name = orgNameFromDomain(opts.domain);
  const code = inviteCode();
  try {
    await sql`
      insert into organizations (id, slug, name, depot, city, invite_code, email_domain, created_by)
      values (${id}, ${slug}, ${name}, ${""}, ${""}, ${code}, ${opts.domain}, ${opts.userId})
    `;
    await insertDefaultModules(id);
    await stampNewOrgBilling(id);
    return id;
  } catch {
    const raced = await findOrgByDomain(opts.domain);
    if (raced) return raced;
    throw new Error("No se pudo abrir el patio de ese correo");
  }
}

/**
 * The signed-in user's email domain is the company key.
 * admin@cerlan.mx and admin@contri.mx never share a patio.
 */
async function attachByEmailDomain(userId: string): Promise<Membership | null> {
  const user = await userRecord(userId);
  if (!user?.email) return null;
  const parsed = parseEmail(user.email);
  if (!parsed || !isCompanyDomain(parsed.domain)) return null;

  const sql = await getSql();
  const already = await sql<{ c: number }>`select count(*)::int as c from org_members where user_id = ${userId}`;
  if ((already[0]?.c ?? 0) > 0) return findMembership(userId);

  const orgId = await createOrgForDomain({ domain: parsed.domain, userId });
  const members = await sql<{ c: number }>`select count(*)::int as c from org_members where org_id = ${orgId}`;
  const inferred = roleFromLocal(parsed.local);
  const role: Role = inferred ?? ((members[0]?.c ?? 0) === 0 ? "admin" : "inspector");
  const displayName = user.name?.trim() || parsed.local;
  await addMember(orgId, userId, displayName, role);
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
  await assertOrgNotSuspended(m.orgId);
  return m;
}

export const getSession = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SessionPayload> => {
    const user = await userRecord(context.userId);
    const membership = await loadMembership(context.userId);
    const billing = membership ? await billingForOrg(membership.orgId) : null;
    return { userId: context.userId, email: user?.email ?? "", membership, billing };
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
  .handler(async ({ context, data }) => {
    const existing = await loadMembership(context.userId);
    if (existing) return existing;
    const sql = await getSql();
    const user = await userRecord(context.userId);
    const parsed = parseEmail(user?.email);
    const domain = parsed && isCompanyDomain(parsed.domain) ? parsed.domain : null;
    if (domain) {
      const attached = await attachByEmailDomain(context.userId);
      if (attached) return attached;
    }
    const id = crypto.randomUUID();
    let slug = slugify(data.name) || "patio";
    const taken = await sql<{ c: number }>`select count(*)::int as c from organizations where slug = ${slug}`;
    if ((taken[0]?.c ?? 0) > 0) slug = `${slug}-${id.slice(0, 4)}`;
    const code = inviteCode();
    await sql`
      insert into organizations (id, slug, name, depot, city, invite_code, email_domain, created_by)
      values (${id}, ${slug}, ${data.name}, ${data.depot}, ${data.city}, ${code}, ${domain}, ${context.userId})
    `;
    await sql`
      insert into org_members (org_id, user_id, display_name, role)
      values (${id}, ${context.userId}, ${data.displayName}, ${"admin"})
    `;
    await insertDefaultModules(id);
    await stampNewOrgBilling(id);
    const created = await findMembership(context.userId);
    if (!created) throw new Error("No se pudo crear la empresa");
    return created;
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
