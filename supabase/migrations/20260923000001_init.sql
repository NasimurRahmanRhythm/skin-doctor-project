-- Lumen & Leaf clinic — core schema.
-- Tables, enums, indexes and human-readable record codes.

create extension if not exists pg_trgm with schema extensions;

-- The clinic is in Bangladesh, so "today" must be Asia/Dhaka. On UTC the
-- daily visit counter and every "today" filter would roll over at 6am local.
create or replace function public.clinic_today()
returns date language sql stable as $fn$
  select (now() at time zone 'Asia/Dhaka')::date;
$fn$;

create type public.app_role as enum ('owner','receptionist','nurse','doctor');
create type public.visit_status as enum ('awaiting_vitals','awaiting_doctor','completed');

-- ---------------------------------------------------------------- staff ----
create table public.staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  full_name  text not null,
  role       public.app_role not null,
  specialty  text,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_role_active_idx on public.staff (role, is_active);

-- ------------------------------------------------------------- patients ----
-- Identity that survives across visits, so a returning patient keeps one code.
create sequence public.patient_code_seq;

create table public.patients (
  id           uuid primary key default gen_random_uuid(),
  patient_code text not null unique
               default 'LL-P-' || lpad(nextval('public.patient_code_seq')::text, 5, '0'),
  full_name    text not null,
  phone        text not null,
  age          int check (age is null or (age >= 0 and age < 130)),
  gender       text,
  address      text,
  created_by   uuid references public.staff(id),
  created_at   timestamptz not null default now()
);
create index patients_phone_idx on public.patients (phone);
create index patients_name_trgm_idx
  on public.patients using gin (full_name gin_trgm_ops);

-- --------------------------------------------------------------- visits ----
create table public.visits (
  id               uuid primary key default gen_random_uuid(),
  visit_code       text not null unique,
  patient_id       uuid not null references public.patients(id) on delete restrict,
  status           public.visit_status not null default 'awaiting_vitals',
  visit_type       text not null default 'new' check (visit_type in ('new','returning')),
  chief_complaint  text,

  -- who handled this visit, at each desk
  receptionist_id  uuid references public.staff(id),
  nurse_id         uuid references public.staff(id),
  doctor_id        uuid references public.staff(id),
  doctor_requested boolean not null default false,  -- false = auto-assigned

  -- nurse desk
  height_cm      numeric(5,2),
  weight_kg      numeric(5,2),
  blood_pressure text,
  blood_sugar    numeric(6,2),
  temperature    numeric(4,1),
  pulse          int,
  nurse_notes    text,

  -- doctor desk
  diagnosis      text,
  prescription   text,
  advice         text,
  follow_up_date date,

  created_at   timestamptz not null default now(),
  vitals_at    timestamptz,
  completed_at timestamptz
);
create index visits_status_created_idx on public.visits (status, created_at desc);
create index visits_doctor_status_idx  on public.visits (doctor_id, status);
create index visits_created_idx        on public.visits (created_at desc);
create index visits_patient_idx        on public.visits (patient_id, created_at desc);
create index visits_receptionist_idx   on public.visits (receptionist_id, created_at desc);

-- Visit codes read aloud over the phone, so: LL-260923-001, not a random hash.
create table public.visit_counters (
  day date primary key,
  n   int  not null
);

create or replace function public.set_visit_code()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare
  d   date := public.clinic_today();
  seq int;
begin
  insert into public.visit_counters (day, n) values (d, 1)
  on conflict (day) do update set n = public.visit_counters.n + 1
  returning n into seq;

  new.visit_code := 'LL-' || to_char(d, 'YYMMDD') || '-' || lpad(seq::text, 3, '0');
  return new;
end $fn$;

create trigger t_visits_set_code
  before insert on public.visits
  for each row when (new.visit_code is null)
  execute function public.set_visit_code();

-- -------------------------------------------------------- visit_entries ----
create table public.visit_entries (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references public.visits(id) on delete cascade,
  type       text not null check (type in ('prescription','report','note','file')),
  title      text not null,
  body       text,
  file_path  text,          -- storage object path, never a URL
  file_name  text,
  file_type  text,
  author_id  uuid references public.staff(id),
  created_at timestamptz not null default now()
);
create index visit_entries_visit_idx on public.visit_entries (visit_id, created_at);

-- -------------------------------------------------------- notifications ----
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.staff(id) on delete cascade,
  visit_id     uuid references public.visits(id) on delete cascade,
  type         text not null,
  title        text not null,
  body         text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_recipient_idx
  on public.notifications (recipient_id, read_at, created_at desc);
