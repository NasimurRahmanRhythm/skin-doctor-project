-- Treatment pages, modelled on athenaderma.com.
--
-- Athena gives every treatment its own page (/microneedling, /chemical-peels…)
-- and groups them on /treatments under Dermatology, Aesthetics and Hair. Each
-- page runs, top to bottom:
--
--   hero        picture, name, a line under the name
--   intro       several paragraphs, then "Book a Consultation"
--   accordions  What to expect · Results and recovery · Before · After
--   FAQ         question/answer pairs
--   closing     a heading and a short paragraph that ask for the booking
--   similar     cards linking to related treatments
--
-- site_treatments grows a column for each of those. Every column is optional,
-- the existing title and description included: the owner can save a treatment
-- half-written and fill it in later. One without a title stays off the website
-- (there is nothing to call it), but is kept in the dashboard.
--
-- Safe to run twice.

-- --------------------------------------------- title, description optional --
alter table public.site_treatments
  alter column title drop not null,
  alter column description drop not null;

alter table public.site_treatments drop constraint if exists site_treatments_title_check;
alter table public.site_treatments drop constraint if exists site_treatments_description_check;
alter table public.site_treatments
  add constraint site_treatments_title_check
    check (title is null or char_length(title) between 1 and 120),
  add constraint site_treatments_description_check
    check (description is null or char_length(description) <= 10000);

-- ------------------------------------------------------------- new columns --
alter table public.site_treatments
  -- The page's address: /treatments/<slug>. Filled from the title when left
  -- blank; a treatment without one is reached by its id instead.
  add column if not exists slug             text,
  -- Athena's three groups (Dermatology / Aesthetics / Hair), but free text.
  add column if not exists category         text,
  -- The small line under the name, e.g. "Profhilo, Volite, Restylane Vital".
  add column if not exists subtitle         text,
  -- Hero picture, and the card picture under "Similar treatments".
  add column if not exists image_path       text,
  -- description stays the intro: the landing page shows its first sentences.
  add column if not exists what_to_expect   text,
  add column if not exists results_recovery text,
  add column if not exists before_care      text,
  add column if not exists after_care       text,
  -- [{ "q": "...", "a": "..." }, ...] in display order.
  add column if not exists faqs             jsonb  not null default '[]'::jsonb,
  add column if not exists closing_title    text,
  add column if not exists closing_body     text,
  -- Hand-picked "Similar treatments", in display order. When empty, the page
  -- falls back to others in the same category.
  add column if not exists related_ids      uuid[] not null default '{}';

do $checks$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_treatments_slug_format') then
    alter table public.site_treatments
      add constraint site_treatments_slug_format
        check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_treatments_text_lengths') then
    alter table public.site_treatments
      add constraint site_treatments_text_lengths check (
            (category         is null or char_length(category)         <= 60)
        and (subtitle         is null or char_length(subtitle)         <= 200)
        and (what_to_expect   is null or char_length(what_to_expect)   <= 10000)
        and (results_recovery is null or char_length(results_recovery) <= 10000)
        and (before_care      is null or char_length(before_care)      <= 10000)
        and (after_care       is null or char_length(after_care)       <= 10000)
        and (closing_title    is null or char_length(closing_title)    <= 200)
        and (closing_body     is null or char_length(closing_body)     <= 3000)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_treatments_faqs_array') then
    alter table public.site_treatments
      add constraint site_treatments_faqs_array check (jsonb_typeof(faqs) = 'array');
  end if;
end $checks$;

create unique index if not exists site_treatments_slug_key
  on public.site_treatments (slug) where slug is not null;

-- ------------------------------------------------- slugs for existing rows --
-- "Custom Facials" → custom-facials; a repeat gets -2, -3…
with base as (
  select id,
         nullif(trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')), '') as s,
         sort_order, created_at
    from public.site_treatments
   where slug is null and title is not null
),
numbered as (
  select id, s,
         row_number() over (partition by s order by sort_order, created_at) as n
    from base
   where s is not null
)
update public.site_treatments t
   set slug = left(case when n.n = 1 then n.s else n.s || '-' || n.n end, 120)
  from numbered n
 where t.id = n.id
   and not exists (
     select 1 from public.site_treatments o
      where o.slug = case when n.n = 1 then n.s else n.s || '-' || n.n end
   );
