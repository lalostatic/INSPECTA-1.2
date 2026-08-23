import { hashPassword } from "better-auth/crypto";
import { getSql } from "@/lib/db";

export async function createCredentialUser(opts: {
  name: string;
  email: string;
  password: string;
}): Promise<{ id: string; created: boolean }> {
  const sql = await getSql();
  const email = opts.email.trim().toLowerCase();
  const existing = await sql<{ id: string }>`
    select id from "user" where email = ${email} limit 1
  `;
  if (existing[0]) return { id: existing[0].id, created: false };

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
  return { id: userId, created: true };
}
