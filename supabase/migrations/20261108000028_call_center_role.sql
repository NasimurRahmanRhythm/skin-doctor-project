-- A new staff role: call center. The owner adds these people like any other
-- staff member; they sign in at /admin/login and land on /admin/call-center,
-- where they log the calls they take or make (see the next migration).
--
-- On its own because Postgres will not let a new enum value be used in the
-- same transaction that adds it. Run this one, then 20261108000029.
--
-- Safe to run twice.

alter type public.app_role add value if not exists 'call_center';
