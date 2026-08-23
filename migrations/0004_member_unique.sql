-- A person belongs to one company at a time so yards never share a login.
create unique index if not exists org_members_user_unique on org_members (user_id);
