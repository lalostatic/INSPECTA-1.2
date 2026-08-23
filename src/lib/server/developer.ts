import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { MODULES } from "@/lib/catalog";
import { getSql } from "@/lib/db";
import { isDeveloperEmail } from "@/lib/developer";
import { isCompanyDomain, parseEmail, slugFromDomain } from "@/lib/email-domain";
import { createCredentialUser } from "@/lib/server/accounts";
import { stampNewOrgBilling } from "@/lib/server/billing";
import { ensureOrgTenant, schemaNameFromOrgId } from "@/lib/server/tenant-schema";
import { inviteCode, slugify } from "@/lib/utils";

export type PatioRow = {
  id: string;
  name: string;
  domain: string;
  authorized: boolean;
  authorizedAt: string | null;
  memberCount: number;
  createdAt: string;
};

async function requireDeveloper(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ email: string }>`select email from "user" where id = ${userId} limit 1`;
  if (!isDeveloperEmail(rows[0]?.email)) throw new Error("Solo el desarrollador autoriza patios");
  return rows[0].email;
}

export const listPatios = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PatioRow[]> => {
    await requireDeveloper(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      name: string;
      email_domain: string | null;
      authorized: boolean;
      authorized_at: string | Date | null;
      created_at: string | Date;
      member_count: number;
    }>`
      select o.id, o.name, o.email_domain, o.authorized, o.authorized_at, o.created_at,
             (select count(*)::int from org_members m where m.org_id = o.id) as member_count
      from organizations o
      order by o.authorized asc, o.created_at desc
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      domain: r.email_domain ?? "",
      authorized: Boolean(r.authorized),
      authorizedAt: r.authorized_at
        ? r.authorized_at instanceof Date
          ? r.authorized_at.toISOString()
          : String(r.authorized_at)
        : null,
      memberCount: Number(r.member_count) || 0,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  });

export const setPatioAuthorized = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ orgId: z.string(), authorized: z.boolean() }).parse(input))
  .handler(async ({ context, data }) => {
    const email = await requireDeveloper(context.userId);
    const sql = await getSql();
    const now = new Date().toISOString();
    if (data.authorized) {
      await sql`
        update organizations
        set authorized = ${true}, authorized_at = ${now}, authorized_by = ${email}
        where id = ${data.orgId}
      `;
    } else {
      await sql`
        update organizations
        set authorized = ${false}
        where id = ${data.orgId}
      `;
    }
    return { ok: true };
  });

const provisionIn = z.object({
  name: z.string().min(2).max(80),
  domain: z.string().min(4).max(80),
  depot: z.string().max(80).default(""),
  city: z.string().max(80).default(""),
  adminName: z.string().min(2).max(80),
  adminEmail: z.string().email().max(120),
  adminPassword: z.string().min(8).max(80),
});

export const provisionPatio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => provisionIn.parse(input))
  .handler(async ({ context, data }) => {
    const devEmail = await requireDeveloper(context.userId);
    const domain = data.domain.trim().toLowerCase().replace(/^@/, "");
    if (!isCompanyDomain(domain)) throw new Error("Use el dominio de la empresa, no Gmail ni Outlook");
    const adminParsed = parseEmail(data.adminEmail);
    if (!adminParsed || adminParsed.domain !== domain) {
      throw new Error(`El administrador debe ser un correo @${domain}`);
    }
    const sql = await getSql();
    const exists = await sql<{ id: string }>`
      select id from organizations where email_domain = ${domain} limit 1
    `;
    if (exists[0]) throw new Error("Ese dominio ya tiene patio");

    const { id: adminId } = await createCredentialUser({
      name: data.adminName,
      email: data.adminEmail.trim().toLowerCase(),
      password: data.adminPassword,
    });
    const takenUser = await sql<{ org_id: string }>`
      select org_id from org_members where user_id = ${adminId} limit 1
    `;
    if (takenUser[0]) throw new Error("Ese correo de administrador ya pertenece a otro patio");

    const id = crypto.randomUUID();
    const dbSchema = schemaNameFromOrgId(id);
    let slug = slugFromDomain(domain) || slugify(data.name) || "patio";
    const taken = await sql<{ c: number }>`select count(*)::int as c from organizations where slug = ${slug}`;
    if ((taken[0]?.c ?? 0) > 0) slug = `${slug}-${id.slice(0, 4)}`;
    const code = inviteCode();
    const now = new Date().toISOString();
    await sql`
      insert into organizations (
        id, slug, name, depot, city, invite_code, email_domain, created_by,
        authorized, authorized_at, authorized_by, db_schema
      ) values (
        ${id}, ${slug}, ${data.name}, ${data.depot}, ${data.city}, ${code}, ${domain}, ${context.userId},
        ${true}, ${now}, ${devEmail}, ${dbSchema}
      )
    `;
    for (const mod of MODULES) {
      await sql`
        insert into org_modules (org_id, module_key, enabled)
        values (${id}, ${mod.key}, ${true})
        on conflict (org_id, module_key) do nothing
      `;
    }
    await stampNewOrgBilling(id);
    await sql`
      insert into org_members (org_id, user_id, display_name, role)
      values (${id}, ${adminId}, ${data.adminName}, ${"admin"})
    `;
    await ensureOrgTenant(id);
    return { ok: true, orgId: id };
  });
