-- Company isolation is the email domain: admin@cerlan.mx ≠ admin@contri.mx
alter table organizations add column if not exists email_domain text;
create unique index if not exists organizations_email_domain_uidx
  on organizations (email_domain)
  where email_domain is not null;
