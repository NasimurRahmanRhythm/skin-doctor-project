# Lumen & Leaf — Clinic Management System (`/super-admin`)

## Context

`D:\Doctor\Skin doctor\` is empty. Two standalone HTML files exist in the parent folder:

- `lumen-leaf-patient-records (1).html` — a working single-file prototype of the whole clinic flow (intake → nurse vitals → doctor entries → find & print). It has no auth, no roles, and stores data in an in-memory `Map` unless a Claude artifact `db` is present. **This is the functional spec.**
- `lumen-leaf-website.html` — the public marketing site. Out of scope for now; the app will be structured so it can be ported in later.

The goal is to turn the prototype into a real multi-user clinic system under `/super-admin`, where four roles log in with their own email + OTP and each sees only their own slice of the workflow, with a live hand-off notification between desks and role-appropriate cumulative printing.

**Decisions locked in with the user:**
- Scope: `/super-admin` staff system only for now.
- Receptionist: can create check-ins **and** see a list of the visits they created today (to reprint / fix typos). No clinical data.
- Data model: **one patient, many visits** — permanent patient code + a visit row per check-in.
- Notifications: **in-app realtime** (sound + badge + toast while the dashboard is open). Web Push is a later phase, and the schema is designed so it can be added without rework.
- **Auth email: Resend**, sending from the user's own already-owned domain.

---

## The two upfront questions, answered

### 1. Will the Supabase free tier handle this? — **Yes, comfortably, with two caveats.**

| Free-tier limit | This clinic's usage | Verdict |
|---|---|---|
| 500 MB database | A visit + entries ≈ 2–5 KB. 100 visits/day ≈ 150 MB **over 3 years** | Fine |
| 1 GB file storage | The real constraint. Phone photos are 3–5 MB each | **Compress client-side** (below) |
| 5 GB egress/month | Text + a few signed-URL image loads | Fine |
| 50,000 monthly active users | ~10 staff | Fine |
| Realtime: 200 peak connections, 2M msg/month | ~10 open dashboards | Fine |
| 2 active projects | 1 | Fine |

**Caveat A — auth emails.** Supabase's built-in sender is capped at **2 emails per hour** and is explicitly testing-only; OTP login for 4+ staff is impossible on it. Solved with Resend — see the dedicated section below.

**Caveat B — no backups, and pausing.** Free projects get no automatic backups and no downloadable dumps, and a project **pauses after 7 days of no database activity** (dedicated section below). Once real patient data is in, **budget for Pro ($25/mo)** — daily backups, point-in-time recovery, and no pausing are the reasons, not the quotas. Until then, run a weekly `pg_dump` to local disk (Phase 8).

**Storage plan:** compress images in the browser before upload (canvas resize to max 1600px, JPEG q0.8) → ~200 KB per file → roughly 5,000 attachments within 1 GB. Store PDFs as-is.

### 2. Can Supabase Realtime do the notifications? — **Yes, and it is the right tool here.**

Realtime **Postgres Changes** is the simplest approach and fits this scale exactly. Its known weakness is that it runs one authorization check per subscriber per change, so it degrades past roughly 3,000 concurrent subscribers. A clinic with ~10 staff is three orders of magnitude below that. (Supabase's newer *Broadcast from Database* scales better and is what to switch to only if this ever grows into many clinics — the schema below doesn't need to change for that.)

**The design:** a `notifications` table with a `recipient_id`. Database triggers write rows into it; each dashboard subscribes to only its own rows:

```ts
supabase.channel(`notif:${userId}`)
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `recipient_id=eq.${userId}` },
      onNewNotification)
  .subscribe()
```

Because the trigger runs inside the same transaction as the insert, the nurse's screen updates the instant the receptionist's save commits — no polling lag.

**What "push notification" realistically means here.** Realtime only reaches an open tab. Layered on top, in order of value:

1. Toast + row appears instantly + unread count badge (Realtime).
2. A short chime via `<audio>` + `document.title` badge — this is what actually gets attention at a busy desk.
3. `Notification` API (OS-level popup, needs one-time permission click) — works when the tab is backgrounded but the browser is open.
4. **Fallback that matters:** re-fetch on `window.focus` and a 30s interval. If the websocket silently drops (flaky clinic wifi), the desk still catches up. Also show a live/reconnecting indicator, like the prototype's `statusPill`.

True push with the browser closed needs a service worker + VAPID + an Edge Function. Deliberately deferred — the `notifications` table already carries everything such a sender would need.

---

## Auth email — Resend

**The one thing that must be right: the domain.** Resend's sandbox sender (`onboarding@resend.dev`) only delivers to the email address on your own Resend account — every other recipient gets a `403 validation_error`. Without a verified domain, the nurse, doctor and receptionist simply never receive an OTP. Since the domain already exists, this is a DNS task, not a blocker.

### Setup order (do this before writing any auth code)

1. **Resend → Domains → Add domain.** Enter the existing domain. Resend produces DKIM + SPF records (and an MX record for the return path). Add them at the DNS host, then click Verify. Propagation is usually minutes.
2. **Resend → API Keys** → create one with sending permission. Treat it as a secret.
3. **Supabase → Project Settings → Auth → SMTP Settings** → enable custom SMTP:

   | Field | Value |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` (implicit TLS); fall back to `587` STARTTLS if 465 is blocked |
   | Username | `resend` — the literal word, not an email |
   | Password | the Resend API key |
   | Sender email | `noreply@yourdomain.com` — **must be on the verified domain** |
   | Sender name | `Lumen & Leaf` |

   *(Supabase also offers a one-click Resend integration that creates the key and fills these in. The domain still has to be verified and the sender address still has to be on it, so the manual route above is only a few clicks more and makes the failure modes visible.)*
4. **Supabase → Auth → Rate Limits** → raise emails-per-hour from the default 30. A clinic morning where everyone logs in at once will otherwise hit it.
5. **Supabase → Auth → Email Templates → Magic Link** → put `{{ .Token }}` in the body. Without this Supabase mails a clickable link instead of a 6-digit code.

### The limit that actually binds

Resend free is 3,000 emails/month **but 100/day**, on 1 verified domain. The daily cap is the real ceiling, and monthly headroom does not rescue a bad day. Ten staff logging in twice a day is ~20 — fine. It only gets dangerous if sessions expire so often that staff re-request OTPs all day.

So this is a design constraint, not just config: **set a long refresh-token lifetime** in Supabase Auth so a nurse logs in once in the morning and stays in for the shift. Short sessions on a clinic floor would be both annoying and quota-burning. Related: the login form must rate-limit its own "Resend code" button (Supabase already enforces one request per 60s; surface that as a countdown rather than letting staff mash it).

Resend keeps 30 days of logs on free — that is where to look first when someone says "I didn't get the code."

---

## Free-project pausing — what actually happens

**A paused project does not wake itself up.** This is the part that is easy to get wrong.

- **Trigger:** no meaningful database activity for 7 days. "A few user requests to the database each day" is enough to prevent it.
- **No auto-resume.** Once paused, incoming requests simply **fail**. Someone must open the Supabase Dashboard and click **Resume project** by hand. It takes a few minutes, so a clinic opening at 9am to a dead site means staff waiting.
- **Data is safe.** Resuming restores the database and config exactly as they were.
- **Warning first.** Supabase emails the project owner roughly a week before pausing, and again once paused. Just visiting the dashboard or making an API call after that warning cancels the pause — so it never happens without notice, provided someone reads that inbox.
- **Hard limit:** paused for more than 1 year and the dashboard can no longer restore it; recovery then means downloading backups into a fresh project.

**The real risk is the build period, not the clinic.** Daily clinic use makes pausing impossible. But leaving the project untouched for 10 days mid-build will pause it. Safeguards:

1. A **daily cron ping** (Vercel Cron, free) hitting a tiny route that runs one trivial query. Set this up in Phase 0, not Phase 8 — it protects the build itself.
2. Make sure the Supabase account email is an inbox someone actually reads.
3. Pro removes pausing entirely, which is a second reason it becomes worth it at go-live.

---

## Stack

- **Next.js 16** (App Router, Active LTS) + TypeScript + **Tailwind CSS v4**
- **Supabase**: Postgres + Auth (email OTP) + Storage + Realtime
- **Resend** as the SMTP provider behind Supabase Auth
- `@supabase/ssr` for cookie-based sessions across server components, server actions, and middleware
- **Zod** for input validation in server actions
- Deploy on **Vercel** free tier

Design tokens (`--ivory`, `--sage`, `--ink`, Fraunces + Work Sans) are lifted directly from the prototype's `:root` block so the app matches the existing brand, including its dark mode.

---

## Data model

`supabase/migrations/0001_init.sql`:

```sql
-- ---------- staff ----------
create type app_role as enum ('owner','receptionist','nurse','doctor');

create table staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text not null,
  role        app_role not null,
  specialty   text,                     -- doctors only, e.g. 'Dermatologist'
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- patients (identity, survives across visits) ----------
create sequence patient_code_seq;
create table patients (
  id            uuid primary key default gen_random_uuid(),
  patient_code  text unique not null
                default 'LL-P-' || lpad(nextval('patient_code_seq')::text, 5, '0'),
  full_name     text not null,
  phone         text not null,
  age           int,
  gender        text,
  address       text,
  created_by    uuid references staff(id),
  created_at    timestamptz not null default now()
);
create index on patients (phone);
create index on patients using gin (full_name gin_trgm_ops);  -- name search

-- ---------- visits (one per check-in) ----------
create type visit_status as enum ('awaiting_vitals','awaiting_doctor','completed');

create table visits (
  id              uuid primary key default gen_random_uuid(),
  visit_code      text unique not null,          -- LL-260923-001, set by trigger
  patient_id      uuid not null references patients(id),
  status          visit_status not null default 'awaiting_vitals',
  visit_type      text not null default 'new',   -- new | returning
  chief_complaint text,

  receptionist_id uuid references staff(id),     -- who checked them in
  nurse_id        uuid references staff(id),     -- who took vitals
  doctor_id       uuid references staff(id),     -- assigned doctor
  doctor_requested boolean not null default false, -- false = auto-assigned

  -- nurse desk
  height_cm       numeric,
  weight_kg       numeric,
  blood_pressure  text,
  blood_sugar     numeric,
  temperature     numeric,
  pulse           int,
  nurse_notes     text,

  -- doctor desk
  diagnosis       text,
  prescription    text,
  advice          text,
  follow_up_date  date,

  created_at      timestamptz not null default now(),
  vitals_at       timestamptz,
  completed_at    timestamptz
);
create index on visits (status, created_at desc);
create index on visits (doctor_id, status);
create index on visits (created_at desc);       -- date filter

-- ---------- timeline entries (prescriptions / reports / notes / files) ----------
create table visit_entries (
  id          uuid primary key default gen_random_uuid(),
  visit_id    uuid not null references visits(id) on delete cascade,
  type        text not null,        -- prescription | report | note | file
  title       text not null,
  body        text,
  file_path   text,                 -- storage object path, not a URL
  file_name   text,
  file_type   text,
  author_id   uuid references staff(id),
  created_at  timestamptz not null default now()
);

-- ---------- notifications ----------
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references staff(id) on delete cascade,
  visit_id      uuid references visits(id) on delete cascade,
  type          text not null,      -- new_patient | vitals_done | ...
  title         text not null,
  body          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index on notifications (recipient_id, read_at, created_at desc);

alter publication supabase_realtime add table notifications;
```

**Why codes are generated in the database, not the client.** The prototype builds IDs from `Date.now()` + `Math.random()` — collidable and unreadable. A trigger using a daily sequence gives `LL-260923-001`, which staff can read aloud over a phone. Search hits both `visit_code` and `patient_code`.

### Doctor assignment ("no preference → random")

Pure random unbalances the queue. Use **least-loaded, random tiebreak**, atomically in the database:

```sql
create function assign_doctor(p_preferred uuid) returns uuid
language sql volatile security definer set search_path = public as $fn$
  select coalesce(
    (select id from staff
      where id = p_preferred and role = 'doctor' and is_active),
    (select s.id from staff s
      left join visits v
        on v.doctor_id = s.id
       and v.status <> 'completed'
       and v.created_at::date = current_date
      where s.role = 'doctor' and s.is_active
      group by s.id
      order by count(v.id) asc, random()
      limit 1)
  );
$fn$;
```

`doctor_requested` records whether the patient asked for that doctor or the system picked — the owner will want that distinction in reports.

### Handover triggers (this is the notification engine)

```sql
-- new check-in -> notify every active nurse
create function notify_nurses() returns trigger language plpgsql
security definer set search_path = public as $fn$
begin
  insert into notifications (recipient_id, visit_id, type, title, body)
  select s.id, new.id, 'new_patient',
         'New patient checked in',
         (select full_name from patients where id = new.patient_id)
           || ' · ' || new.visit_code
  from staff s where s.role = 'nurse' and s.is_active;
  return new;
end $fn$;

create trigger t_notify_nurses after insert on visits
  for each row execute function notify_nurses();

-- vitals saved -> notify the assigned doctor only
create trigger t_notify_doctor after update of status on visits
  for each row
  when (new.status = 'awaiting_doctor' and old.status = 'awaiting_vitals')
  execute function notify_doctor();
```

### RLS

One `security definer` helper avoids recursive policy lookups on `staff`:

```sql
create function public.my_role() returns app_role
language sql stable security definer set search_path = public as $fn$
  select role from staff where id = auth.uid() and is_active
$fn$;
```

Policy matrix (RLS enabled on every table; owner reads everything):

| Table | owner | receptionist | nurse | doctor |
|---|---|---|---|---|
| `patients` | all | select, insert, update | select (via visit) | select (via visit) |
| `visits` | all | insert; select **own** `receptionist_id` rows | select `awaiting_vitals` + own; update vitals cols | select own `doctor_id` rows; update doctor cols |
| `visit_entries` | all | **none** | insert/select on own visits | insert/select on own visits |
| `notifications` | own | own | own | own |
| `staff` | all (incl. insert) | select names only | select names only | select names only |

RLS enforces **row** access. **Column** access (a nurse must not write `diagnosis`) is enforced in the server actions with Zod schemas that only accept that role's fields — plus a `BEFORE UPDATE` trigger that rejects out-of-role column changes as defence in depth. Never trust the client to send only its own fields.

---

## Routes

```
app/
  super-admin/
    login/page.tsx                   email → OTP → role-based redirect
    layout.tsx                       auth gate + role-aware shell/nav
    page.tsx                         redirects to the right desk for your role

    reception/page.tsx               check-in form + "my check-ins today"
    reception/[visitId]/print        reception slip

    nurse/page.tsx                   live queue + notification bell
    nurse/[visitId]/page.tsx         vitals form (reception info shown read-only)

    doctor/page.tsx                  live queue, filtered to my patients
    doctor/[visitId]/page.tsx        diagnosis/prescription + full prior context

    owner/page.tsx                   patient table: search + date filter
    owner/patients/[id]/page.tsx     full history, every visit, every entry
    owner/staff/page.tsx             add/deactivate doctor, nurse, receptionist

    print/[visitId]/page.tsx?scope=  shared print renderer
  api/cron/ping/route.ts             daily keep-alive (anti-pause)
  middleware.ts                      session refresh + /super-admin gate
lib/supabase/{client,server,admin}.ts
lib/{codes,roles,validation}.ts
components/{NotificationBell,RealtimeProvider,PrintSheet,...}
supabase/migrations/*.sql
```

**Auth flow.** `signInWithOtp({ email, options: { shouldCreateUser: false } })` → `verifyOtp({ email, token, type: 'email' })`. `shouldCreateUser: false` is what stops strangers from self-registering. Codes expire in 1 hour; one request per 60s.

**Creating staff.** Owner-only server action using the **service-role key** (server-side only, never in a client bundle) → `auth.admin.createUser({ email, email_confirm: true })` → insert the `staff` row in the same action. The new hire then logs in with OTP; no password ever exists.

---

## Printing

One renderer, four scopes, each cumulative — exactly as asked:

| Scope | Contains |
|---|---|
| `reception` | Patient details, visit code, assigned doctor |
| `nurse` | + vitals |
| `doctor` | + diagnosis, prescription, advice, follow-up |
| `full` | + the whole entry timeline and attachments |

The prototype's `@media print` block (lines 134–155) and its `printRecordSheet()` markup (lines 901–948) are already well-built — letterhead, meta grid, vitals band, signature line. Port that CSS and structure rather than rewriting it. Render server-side so the print page is identical every time, and call `window.print()` on mount.

---

## Phases

**Phase 0 — Scaffold.** `create-next-app` with TypeScript + Tailwind + App Router. Port design tokens from the prototype. `.env.local` with the three Supabase keys; confirm `.gitignore` covers it. Set up the **daily cron ping** now so the project can't pause mid-build. *Note: the folder name has a space in it. Next.js and npm handle this fine on Windows, but if you hit an odd tooling error later, renaming to `skin-doctor` is the first thing to try.*

**Phase 1 — Database.** Write and apply the migrations above: tables, enums, code triggers, `assign_doctor`, notification triggers, `my_role()`, all RLS policies, the private `patient-files` storage bucket with its policies. Seed 4 test staff.

**Phase 2 — Auth (Resend first).** Verify the domain in Resend, wire Supabase SMTP to it, raise the rate limit, add `{{ .Token }}` to the Magic Link template, set a long refresh-token lifetime — **all before any code**, because nothing in this phase is testable until an OTP actually lands in an inbox. Then: login page with email → 6-digit code, resend-code countdown, `verifyOtp`, middleware gate, role-based redirect, sign-out, `getSessionStaff()` helper.

**Phase 3 — Reception.** Check-in form (new vs returning — returning looks up by phone and reuses the patient row), doctor dropdown populated from active doctors + "No preference", `assign_doctor` on submit, success screen showing the visit code, "my check-ins today" list, reception print.

**Phase 4 — Nurse + Realtime.** This is the phase that proves the core idea. Queue of `awaiting_vitals`, `RealtimeProvider` subscribing to `notifications`, bell + unread count + chime + toast + title badge, focus/interval fallback, connection status pill. Vitals form sets `status = 'awaiting_doctor'`, stamps `nurse_id`, fires the doctor trigger. Cumulative print.

**Phase 5 — Doctor.** Same realtime shell, queue filtered to `doctor_id = me`. Detail page shows reception + vitals read-only, plus this patient's previous visits (the prototype's `pastVisitsHTML` idea, now a real foreign-key join instead of a phone-string match). Diagnosis/prescription/advice/follow-up, entry timeline with file upload, `status = 'completed'`. Cumulative print.

**Phase 6 — Owner.** Patient/visit table with search by **code or name** and a **date-range filter**, all server-side. Full patient history view showing who handled each visit (receptionist, nurse, doctor). Staff management: add/deactivate. Small dashboard: today's counts by status, per-doctor load.

**Phase 7 — Polish.** Client-side image compression before upload, empty/loading/error states, mobile layout (nurses will use phones), a `visit_summary` view to keep list queries to one round-trip.

**Phase 8 — Deploy.** Vercel, env vars, real staff accounts, `pg_dump` backup script + the Pro-upgrade decision.

---

## Verification

Each phase is verifiable by hand; do not batch this to the end.

1. **OTP deliverability (Phase 2 gate).** Send a login code to a Gmail address *and* a non-Gmail one, neither being the Resend account owner's. Both must arrive **in the inbox, not spam**, and show as Delivered in the Resend dashboard. A 403 here means the sender address isn't on the verified domain; a spam landing means DKIM/SPF didn't propagate.
2. **Realtime hand-off (the critical test).** Two browsers side by side — receptionist in one, nurse in the other. Submit a check-in. The nurse's row + chime + badge must appear within ~1 second, with no refresh. Repeat nurse → doctor. Then kill wifi on the nurse window mid-flow, re-enable it, and confirm the fallback re-fetch catches the missed patient and the status pill recovers.
3. **RLS, tested as an attacker, not as a user.** Log in as doctor A and, from the browser console with the authenticated client, try `select` on a visit assigned to doctor B — it must return zero rows, not an error you could mistake for a bug. Same for a receptionist reading `visit_entries`, and a nurse writing `diagnosis`. Verifying only through the UI proves nothing, because the UI already hides those buttons.
4. **Auto-assignment.** Create 3 doctors, submit 6 "no preference" check-ins, confirm a 2/2/2 spread rather than a random clump.
5. **Returning patient.** Check in the same phone number twice; there must be **one** `patients` row and **two** `visits`, and the doctor must see visit 1 in history while working on visit 2.
6. **Print.** Print at each of the four scopes and confirm each includes everything from the stages before it, and that only the sheet prints (the prototype's `body * { visibility: hidden }` rule handles this).
7. **Session length.** Log in, leave the tab for a few hours, come back — you must still be signed in. Re-prompting for OTP burns the 100/day Resend cap.
8. **Owner search.** Find a visit by code, by partial name, and by date range.

---

## Risks

- **Resend sandbox sender** — `onboarding@resend.dev` only reaches your own account email; everyone else gets a 403. The sender must be `noreply@<verified domain>`. This is the single most likely cause of "OTP isn't arriving."
- **Resend 100/day cap** — the binding limit, not the 3,000/month figure. Mitigated by long sessions; watch it if staff start re-requesting codes.
- **Free-tier backups** — none. Real patient records should not sit on an unbacked-up free project indefinitely; plan the Pro upgrade around go-live, not around hitting a quota.
- **Project pausing** — no auto-resume; see the dedicated section. Mitigated by the cron ping during the build, and eliminated by Pro.
- **Storage ceiling** — 1 GB goes fast with uncompressed phone photos. Compression in Phase 7 is not optional polish.
- This stores identifiable health data. Bangladesh has no HIPAA-equivalent, but the service-role key and the Resend API key must stay server-side, the storage bucket must stay private (signed URLs only), and staff accounts should be deactivated the day someone leaves.

## Sources

- [Supabase pricing — Free plan limits](https://supabase.com/pricing)
- [Supabase production checklist — email rate limits, backups](https://supabase.com/docs/guides/platform/going-into-prod)
- [Supabase — Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase passwordless email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase Postgres Changes — scaling notes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Resend — Send with SMTP](https://resend.com/docs/send-with-smtp)
- [Resend — 403 error using the resend.dev domain](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
- [Resend — Configure Supabase to send from your domain](https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain)
- [Resend — Account quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
