-- A supervisor: signs in at /admin/login and sees only the call center and
-- the website stats, read only. The owner adds them on the Staff page.
--
-- On its own: a new enum value cannot be used in the same transaction that
-- adds it, so the policies that mention it are in the next migration.
alter type public.app_role add value if not exists 'supervisor';
