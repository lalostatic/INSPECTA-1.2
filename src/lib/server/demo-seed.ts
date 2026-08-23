import { createServerFn } from "@tanstack/react-start";
import { hashPassword } from "better-auth/crypto";
import { DEMO_ORGS, DEMO_PASSWORD, demoEmail, type DemoOrg } from "@/lib/demo-accounts";
import { addDays, addMonths } from "@/lib/billing";
import { MODULES, type Role } from "@/lib/catalog";
import { getSql } from "@/lib/db";
import { setOrgPeriod, stampNewOrgBilling } from "@/lib/server/billing";
import { seedOrgIfEmpty } from "@/lib/server/seed";
import { todayISO } from "@/lib/utils";

const globalRef = globalThis as typeof globalThis & {
  __inspectaDemoSeed__?: Promise<void>;
};

async function insertCredentialUser(opts: {
  name: string;
  email: string;
  password: string;
}): Promise<string> {
  const sql = await getSql();
  const email = opts.email.trim().toLowerCase();
  const existing = await sql<{ id: string }>`
    select id from "user" where email = ${email} limit 1
  `;
  if (existing[0]) return existing[0].id;

  const userId = crypto.randomUUID();
  const hashed = await hashPassword(opts.password);
  const now = new Date().toISOString();
  await sql`
    insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    values (${userId}, ${opts.name}, ${email}, ${true}, ${now}, ${now})
  `;
  await sql`
    insert into "account" (
      id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
    ) values (
      ${crypto.randomUUID()}, ${userId}, ${"credential"}, ${userId}, ${hashed}, ${now}, ${now}
    )
  `;
  return userId;
}

async function ensureDemoOrg(org: DemoOrg, adminUserId: string): Promise<string> {
  const sql = await getSql();
  const found = await sql<{ id: string }>`
    select id from organizations
    where email_domain = ${org.domain} or slug = ${org.slug}
    order by created_at
    limit 1
  `;
  if (found[0]) {
    await sql`
      update organizations
      set email_domain = ${org.domain},
          name = ${org.name},
          depot = ${org.depot},
          city = ${org.city},
          invite_code = ${org.inviteCode}
      where id = ${found[0].id}
    `;
    for (const mod of MODULES) {
      await sql`
        insert into org_modules (org_id, module_key, enabled)
        values (${found[0].id}, ${mod.key}, ${true})
        on conflict (org_id, module_key) do nothing
      `;
    }
    return found[0].id;
  }

  const id = crypto.randomUUID();
  await sql`
    insert into organizations (id, slug, name, depot, city, invite_code, email_domain, created_by)
    values (
      ${id}, ${org.slug}, ${org.name}, ${org.depot}, ${org.city},
      ${org.inviteCode}, ${org.domain}, ${adminUserId}
    )
    on conflict (slug) do nothing
  `;
  const again = await sql<{ id: string }>`
    select id from organizations where slug = ${org.slug} or email_domain = ${org.domain} limit 1
  `;
  const orgId = again[0]?.id ?? id;
  for (const mod of MODULES) {
    await sql`
      insert into org_modules (org_id, module_key, enabled)
      values (${orgId}, ${mod.key}, ${true})
      on conflict (org_id, module_key) do nothing
    `;
  }
  return orgId;
}

async function applyDemoBilling(orgId: string, billing: "active" | "due") {
  const today = todayISO();
  const periodEnd = billing === "due" ? addDays(today, -1) : addMonths(today, 1);
  await setOrgPeriod(orgId, periodEnd);
  await stampNewOrgBilling(orgId);
}

async function ensureMember(orgId: string, userId: string, name: string, role: Role) {
  const sql = await getSql();
  await sql`
    insert into org_members (org_id, user_id, display_name, role)
    values (${orgId}, ${userId}, ${name}, ${role})
    on conflict (org_id, user_id) do update
      set display_name = excluded.display_name, role = excluded.role
  `;
}

export async function seedDemoAccounts() {
  if (!globalRef.__inspectaDemoSeed__) {
    globalRef.__inspectaDemoSeed__ = (async () => {
      for (const org of DEMO_ORGS) {
        const ids = new Map<string, string>();
        for (const account of org.accounts) {
          const email = demoEmail(account.local, org.domain);
          const id = await insertCredentialUser({
            name: account.name,
            email,
            password: DEMO_PASSWORD,
          });
          ids.set(email, id);
        }
        const adminEmail = demoEmail("admin", org.domain);
        const adminId = ids.get(adminEmail);
        if (!adminId) throw new Error(`No se pudo crear el administrador de ${org.name}`);
        const orgId = await ensureDemoOrg(org, adminId);
        await applyDemoBilling(orgId, org.billing);
        for (const account of org.accounts) {
          const email = demoEmail(account.local, org.domain);
          const userId = ids.get(email);
          if (!userId) continue;
          await ensureMember(orgId, userId, account.name, account.role);
        }
        const inspectorEmail = demoEmail("inspector", org.domain);
        const inspectorId = ids.get(inspectorEmail) ?? adminId;
        const inspectorName = org.accounts.find((a) => a.local === "inspector")?.name ?? "Inspector";
        await seedOrgIfEmpty(orgId, inspectorId, inspectorName, org.sample);
      }
    })().catch((err) => {
      globalRef.__inspectaDemoSeed__ = undefined;
      throw err;
    });
  }
  await globalRef.__inspectaDemoSeed__;
}

/** Public, unauthenticated — runs when the login page loads. */
export const ensureDemoUsers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await seedDemoAccounts();
    return { ok: true };
  } catch (err) {
    console.error("[inspecta] demo seed failed", err);
    return { ok: false };
  }
});
