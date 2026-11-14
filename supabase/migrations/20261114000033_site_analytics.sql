-- The website's own numbers, kept here rather than only in Meta: visits,
-- which treatments people look at, how they get in touch, and which ad
-- campaign each inquiry came from.
--
--   site_events          one row per thing a visitor did:
--                          page_view     a page opened
--                          view_content  a treatment page opened (label = treatment)
--                          contact       WhatsApp, Instagram DM or phone tapped (label = channel)
--                          book_click    the inquiry form opened from another page (label = that page)
--                          lead          an inquiry saved (written by the server)
--                        Nothing about the person: a random id for the visit
--                        (one browser tab session), the campaign tags the visit
--                        arrived with, the site that sent them, phone or
--                        computer. No IP, no name, no message.
--   inquiries.utm_*      the campaign an inquiry's visitor first arrived with,
--                        so the owner sees which ad brought it.
--   site_report()        the owner's numbers for a date range.
--
-- Writes come only through the website's own server (service role); the
-- owner reads. Safe to run twice.

create table if not exists public.site_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  event         text not null
                check (event in ('page_view', 'view_content', 'contact', 'book_click', 'lead')),
  path          text check (path is null or char_length(path) <= 300),
  label         text check (label is null or char_length(label) <= 120),
  session_id    text check (session_id is null or session_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  utm_source    text check (utm_source is null or char_length(utm_source) <= 100),
  utm_medium    text check (utm_medium is null or char_length(utm_medium) <= 100),
  utm_campaign  text check (utm_campaign is null or char_length(utm_campaign) <= 150),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 120),
  device        text check (device is null or device in ('mobile', 'desktop'))
);

create index if not exists site_events_created_idx on public.site_events (created_at desc);
create index if not exists site_events_event_idx on public.site_events (event, created_at desc);

alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant select, delete on public.site_events to authenticated;

drop policy if exists site_events_owner_read on public.site_events;
create policy site_events_owner_read on public.site_events
  for select to authenticated using (public.is_owner());

drop policy if exists site_events_owner_delete on public.site_events;
create policy site_events_owner_delete on public.site_events
  for delete to authenticated using (public.is_owner());

-- ------------------------------------------------- campaign on inquiries --
alter table public.inquiries
  add column if not exists utm_source   text check (utm_source is null or char_length(utm_source) <= 100),
  add column if not exists utm_medium   text check (utm_medium is null or char_length(utm_medium) <= 100),
  add column if not exists utm_campaign text check (utm_campaign is null or char_length(utm_campaign) <= 150);

-- ---------------------------------------------------------------- report --
-- Runs as the caller, so RLS decides: only the owner gets anything. Days are
-- the clinic's (Asia/Dhaka). A "visit" is one session id.
create or replace function public.site_report(p_from date, p_to date)
returns jsonb language sql stable security invoker
set search_path = public as $fn$
  with e as (
    select s.*, (s.created_at at time zone 'Asia/Dhaka')::date as day
      from site_events s
     where (s.created_at at time zone 'Asia/Dhaka')::date between p_from and p_to
  ),
  -- Where each visit came from: its first event's campaign or referrer.
  visits as (
    select distinct on (session_id)
           session_id,
           coalesce(nullif(utm_source, ''),
                    case
                      when referrer_host ~* '(facebook|fb\.)' then 'facebook'
                      when referrer_host ~* 'instagram' then 'instagram'
                      when referrer_host ~* 'google' then 'google'
                      when referrer_host is null or referrer_host = '' then 'direct'
                      else referrer_host
                    end) as source,
           utm_campaign as campaign,
           device
      from e
     where session_id is not null
     order by session_id, created_at
  ),
  -- Leads per visit: the server writes a lead with the visit's session id,
  -- so it is credited to wherever that visit came from.
  visit_leads as (
    select session_id, count(*) n from e where event = 'lead' and session_id is not null group by session_id
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'visits',       (select count(*) from visits),
      'page_views',   (select count(*) from e where event = 'page_view'),
      'view_content', (select count(*) from e where event = 'view_content'),
      'contacts',     (select count(*) from e where event = 'contact'),
      'book_clicks',  (select count(*) from e where event = 'book_click'),
      'leads',        (select count(*) from e where event = 'lead'),
      'mobile',       (select count(*) from visits where device = 'mobile')
    ),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
               'day', d::date,
               'visits', (select count(distinct session_id) from e where e.day = d::date),
               'leads', (select count(*) from e where e.day = d::date and e.event = 'lead')
             ) order by d)
        from generate_series(p_from, p_to, interval '1 day') d
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', n) order by n desc)
        from (select path, count(*) n from e where event = 'page_view' and path is not null
               group by path order by n desc limit 10) x
    ), '[]'::jsonb),
    'treatments', coalesce((
      select jsonb_agg(jsonb_build_object('name', label, 'views', n) order by n desc)
        from (select label, count(*) n from e where event = 'view_content' and label is not null
               group by label order by n desc limit 10) x
    ), '[]'::jsonb),
    'contacts', coalesce((
      select jsonb_object_agg(label, n)
        from (select coalesce(label, 'Other') label, count(*) n from e where event = 'contact' group by 1) x
    ), '{}'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'visits', n, 'leads', leads) order by n desc)
        from (select v.source, count(*) n, coalesce(sum(l.n), 0) leads
                from visits v left join visit_leads l using (session_id)
               group by v.source) x
    ), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('campaign', campaign, 'source', source, 'visits', n, 'leads', leads)
                       order by n desc)
        from (select v.campaign, min(v.source) source, count(*) n, coalesce(sum(l.n), 0) leads
                from visits v left join visit_leads l using (session_id)
               where v.campaign is not null
               group by v.campaign) x
    ), '[]'::jsonb)
  );
$fn$;

revoke all on function public.site_report(date, date) from public, anon;
grant execute on function public.site_report(date, date) to authenticated;
