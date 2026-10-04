-- The public website's content, managed by the owner from the dashboard.
--
--   site_links            "As seen in" articles and "Certifications &
--                         Societies": a title and where it links to.
--   site_treatments       title + description; the landing page shows the
--                         first sentences, /treatments the whole thing.
--   site_packages         title, description, image, optional price.
--   site_results          before/after photo pairs with a caption.
--   site_products         the shop: every field optional, but never blank.
--   site_instagram_posts  a photo and the post it opens.
--   site_settings         one-off values (Instagram profile, Google reviews).
--   inquiries             what visitors send from the "Book a Consultation"
--                         form. Never readable by the public.
--
-- Pattern for every site_* list: anyone may read the active rows (the landing
-- page is public), only the owner may read hidden rows or write. Images live
-- in the public site-media bucket; an *_path that starts with "/" is a file
-- shipped in /public instead, which is how the seeded packages keep their
-- current pictures until the owner uploads new ones.
--
-- Safe to run twice.

-- ------------------------------------------------------------- site_links --
create table if not exists public.site_links (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('press','certification')),
  title       text not null check (char_length(title) between 1 and 120),
  url         text not null check (url ~* '^https?://'),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists site_links_kind_order_idx
  on public.site_links (kind, sort_order);

-- -------------------------------------------------------- site_treatments --
create table if not exists public.site_treatments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 5000),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------- site_packages --
create table if not exists public.site_packages (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 3000),
  image_path  text not null,
  price       text check (price is null or char_length(price) between 1 and 60),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------- site_results --
create table if not exists public.site_results (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 120),
  description       text check (description is null or char_length(description) <= 500),
  before_image_path text not null,
  after_image_path  text not null,
  sort_order        int  not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------- site_products --
create table if not exists public.site_products (
  id          uuid primary key default gen_random_uuid(),
  title       text check (title is null or char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  price       text check (price is null or char_length(price) between 1 and 60),
  image_path  text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint site_products_not_blank check (title is not null or image_path is not null)
);

-- --------------------------------------------------- site_instagram_posts --
create table if not exists public.site_instagram_posts (
  id          uuid primary key default gen_random_uuid(),
  image_path  text not null,
  url         text not null check (url ~* '^https://(www\.)?instagram\.com/'),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------- site_settings --
-- Key/value for single values. Only keys listed in the public policy below
-- are readable by visitors.
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------- inquiries --
create table if not exists public.inquiries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 254),
  message     text not null check (char_length(message) between 1 and 3000),
  -- Only used to slow down a script hammering the form; never shown.
  ip          text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists inquiries_unread_idx on public.inquiries (is_read) where not is_read;

-- -------------------------------------------------------------------- RLS --
do $rls$
declare
  t text;
begin
  foreach t in array array['site_links','site_treatments','site_packages',
                           'site_results','site_products','site_instagram_posts']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_active)',
      t || '_public_read', t);

    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_owner()) with check (public.is_owner())',
      t || '_owner_all', t);
  end loop;
end $rls$;

alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon;
grant select, insert, update, delete on public.site_settings to authenticated;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (key in ('instagram', 'google_reviews'));

drop policy if exists site_settings_owner_all on public.site_settings;
create policy site_settings_owner_all on public.site_settings
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Visitors never touch this table directly: the form posts to a server
-- action that validates, rate-limits and inserts with the service role.
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;

drop policy if exists inquiries_owner_all on public.inquiries;
create policy inquiries_owner_all on public.inquiries
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ------------------------------------------------------- site-media bucket --
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

drop policy if exists site_media_owner_read on storage.objects;
create policy site_media_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'site-media' and public.is_owner());

drop policy if exists site_media_owner_insert on storage.objects;
create policy site_media_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and public.is_owner());

drop policy if exists site_media_owner_delete on storage.objects;
create policy site_media_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and public.is_owner());

-- ------------------------------------------------------------------- seed --
-- The treatments and packages the site showed before, so it is not empty the
-- moment this runs. Results, products, links and Instagram posts were template
-- placeholders and are deliberately not seeded.
insert into public.site_treatments (title, description, sort_order)
select v.title, v.description, v.sort_order
  from (values
    ('Custom Facials',
     'Hydrating, resurfacing, and calming facials tailored to your skin''s current needs.', 1),
    ('Injectables',
     'Subtle, precise work — softening lines while keeping your expression your own.', 2),
    ('Laser Resurfacing',
     'Targeted treatment for texture, tone, and sun damage using gentle protocols.', 3),
    ('Body Contouring',
     'Non-invasive sculpting for stubborn areas, with realistic outcomes discussed upfront.', 4),
    ('Skin Health & Screening',
     'Routine checks and consultations for lasting skin health, not just appearance.', 5),
    ('Hair & Scalp Care',
     'Treatment for hair thinning and scalp health, grounded in current research.', 6)
  ) as v(title, description, sort_order)
 where not exists (select 1 from public.site_treatments);

insert into public.site_packages (title, description, image_path, sort_order)
select v.title, v.description, v.image_path, v.sort_order
  from (values
    ('SmartGlow',
     'A single-session reset — brightening facial plus a take-home care plan.',
     '/media/p51185.jpg', 1),
    ('Skin Reset',
     'Four sessions over eight weeks, combining resurfacing and hydration therapy.',
     '/media/p51186.jpg', 2),
    ('Skin Reset Plus',
     'Our full protocol — resurfacing, injectables consult, and quarterly check-ins.',
     '/media/p51183.jpg', 3)
  ) as v(title, description, image_path, sort_order)
 where not exists (select 1 from public.site_packages);
