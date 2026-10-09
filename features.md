# Feature Requests

Features to build next. Each one gets added here before any code is written.

Status: ⬜ Not started · 🟡 In progress · ✅ Done

---

## Implementation status (2026-10-04)

All 22 features are built. Type-check, lint and `next build` pass. The public pages render, and every DB-driven section hides itself until it has data.

**Before deploying, run the SQL.** Paste [supabase/apply_2026-10-04.sql](supabase/apply_2026-10-04.sql) into the Supabase SQL editor. It combines migrations 13–15 and is safe to run twice. Until it runs, the doctor's Rx page (`follow_up` column) and the staff page (`photo_path`, `show_on_website`) will fail to load.

**Differences from the plan above**
- The site tables are prefixed `site_`: `site_links` (press + certifications, shared), `site_treatments`, `site_packages`, `site_results`, `site_products`, `site_instagram_posts`, `site_settings`. Inquiries are stored in `inquiries`.
- The owner manages everything at `/admin/owner/website` (one tab per list, plus Google reviews) and `/admin/owner/inquiries`. Both are linked from the owner dashboard.
- Uploaded images are shrunk in the browser before upload. The server-action body limit is raised to 12 MB in `next.config.ts`.
- The Follow Up box saves with the pad's autosave, so it has no separate Save button.
- Inquiries are visible to the **owner only**, which was the open question in feature 21.
- Landing counts before "See more": Treatments 6, Packages 3, Shop 4, Doctors 4, Results 3. The full lists are at `/treatments`, `/packages`, `/products`, `/doctors` and `/results`.
- **Follow-up fixes (same day):**
  - Doctors show 4 on the landing page, with "See all doctors" linking to `/doctors`.
  - Inside a modal the custom cursor sits behind the dialog's top layer, so the system cursor is shown while one is open.
  - "Transformative Results" (the before/after slider) is kept and seeded with its 3 old placeholder sliders (migration 16). Placeholders use one picture for both sides and keep the old tint on "before". The owner manages it at Website → **Before & After**. Only the drag-strip "Before & After Gallery" is removed.

**Still needed from the user**
- The clinic **phone number**. It is a placeholder in `CLINIC_PHONE`, `lib/clinic.ts`.
- **Google reviews:** a `GOOGLE_PLACES_API_KEY` in `.env.local` and on Vercel, and the clinic's **Place ID** entered in Website → Google reviews.
- The contact **email** on the site is still the template's `hello@dermasoul.demo` (`lib/site/content.ts`).

<!-- New features go below -->

## 1. Tablet / Non-tablet → Medicine / Non-medicine, and a multi-line box for Non-medicine ✅

**Where:** the Rx pad's medicine section, used by the doctor
([rx-editor.tsx](app/(console)/admin/(desk)/doctor/[visitId]/rx-editor.tsx), `MedicineList`).

**What changes**

- Rename the toggle above the add box:
  - "Tablet" → **"Medicine"**
  - "Non-tablet" → **"Non-medicine"**
- When **Non-medicine** is selected, the single-line add box becomes a **textarea**:
  - Enter adds a new line inside the box. It does not save.
  - The doctor can write several lines, then click **Save** (or press Ctrl+Enter) to add the entry.
  - The textarea grows with its content.
- When **Medicine** is selected, nothing changes: it stays a single-line input where Enter adds, followed by the dose, meal and duration fields.

**Tasks**

- [ ] `rx-editor.tsx`: rename the toggle labels and update the placeholder text.
- [ ] `rx-editor.tsx`: show a `<textarea>` instead of the `<input>` when `kind === "other"`. Enter = new line, Ctrl+Enter or the Save button = add. Change the button label from "Add" to "Save" in this mode.
- [ ] `rx-editor.tsx`: a Non-medicine row already in the list must also be editable as multi-line text. `InlineText` is single-line, so these rows need a textarea variant.
- [ ] `rx-editor.tsx`: `addRef` is typed as `HTMLInputElement`, but the + button beside the heading must also focus the textarea. Widen the type or use a separate ref.
- [ ] `lib/prescription.ts`: raise the 200-character name limit for the `other` kind (e.g. 1000) so several lines fit. Keep the line breaks and only trim the ends.
- [ ] [components/rx-pad.tsx](components/rx-pad.tsx) `ReadMedicines`: add `whitespace-pre-line` so the line breaks show on screen and in print.
- [ ] Check that the print layout still fits when a Non-medicine entry has several lines.

**No data migration:** the stored `kind` stays `"tablet"` / `"other"`, and only the labels change. Old prescriptions keep working.

**Decided:** a textarea saves as **one entry** with several lines (numbered once). Lines are not split into separate entries.

---

## 2. Follow Up section below the prescription ✅

**Where:** the right column of the Rx pad, below the medicine list. It appears in both the doctor's editor and the print page.

**What changes**

- A new **"Follow Up"** section under the Rx / medicine section.
- It has a **textarea** where the doctor can write several lines, e.g. "Come back after 2 weeks / bring previous reports".
- Clicking **Save** (or pressing Ctrl+Enter) saves it. It is a single free-text block per visit, not a list.
- The printed prescription shows the saved text under the medicines, with its line breaks kept.
- If it is empty, the print shows nothing (or blank lines, to match the other sections).

**Tasks**

- [ ] New migration `supabase/migrations/2026xxxx_follow_up.sql`: add `follow_up text` to `public.visits`. Check that the RLS / update policies cover the new column.
- [ ] `lib/prescription.ts`: add `followUp: string` to `PadData`, `padSchema` (trimmed, max ~1000), `PadSource`, `PAD_COLUMNS` and the function that builds the pad from a visit.
- [ ] `app/(console)/admin/(desk)/doctor/actions.ts` `savePad`: write `follow_up`.
- [ ] `rx-editor.tsx`: add a `PadSection title="Follow Up"` below the medicine section in the `right` column, with a textarea and a Save button. It must also work with the existing autosave and dirty tracking.
- [ ] `components/rx-pad.tsx`: add a read-only `ReadFollowUp` (with `whitespace-pre-line`) and use it on the print page (`app/(console)/admin/print/[visitId]/page.tsx`).
- [ ] `previous-visits.tsx`: show the follow-up for past visits, if past visits show the pad.
- [ ] Check that the print still fits on one A4 page.

---

## 3. Clinic address and phone in the gold band ✅

**Where:** [components/rx-pad.tsx](components/rx-pad.tsx). This is the gold `GOLD_BAND` strip at the **bottom** of the prescription (`Footer`), which currently shows "DERMASOUL MEDICAL AESTHETICS · BY DR. NUSRAT LIZA" centered.

**What changes**

- **Left side:** the main clinic's **address**.
- **Right side:** the main clinic's **phone number**.
- The "DERMASOUL MEDICAL AESTHETICS · BY DR. NUSRAT LIZA" line is **removed**. The letterhead at the top already shows the brand and the doctor's name, so the band stays uncluttered.
- It is shown both on screen and in print, in white text on the gold band, as now.

**Tasks**

- [ ] Add the main clinic's address and phone as constants in `lib/clinic.ts`, e.g. `CLINIC_ADDRESS` and `CLINIC_PHONE`. No clinic table exists in the database.
- [ ] `rx-pad.tsx` `Footer`: change the band to `flex justify-between`, with the address on the left and the phone on the right. Allow the address to wrap to two lines if it is long.
- [ ] Check the print on A4 so the text does not overflow or get cut off.

**Address:** "Banani, Dhaka", the same as on the landing page (see feature 6). Share one constant with `lib/site/content.ts` so the two never drift apart.

**Pending:** the phone number will be provided later. Until then, use a placeholder.

---

## 4. Owner manages Designations; doctors pick one ✅

**Where:** the owner panel, Staff page
([owner/staff/page.tsx](app/(console)/admin/(desk)/owner/staff/page.tsx),
[add-staff-form.tsx](app/(console)/admin/(desk)/owner/staff/add-staff-form.tsx),
[owner/actions.ts](app/(console)/admin/(desk)/owner/actions.ts)).

**Today:** when adding a doctor, "Specialty" is a free-text input. The value is saved in `staff.specialty` and printed under the doctor's name on the prescription letterhead.

**What changes**

- The owner panel gets a **Designations** list, e.g. "Consultant Dermatologist", "Skin Specialist" or "Aesthetic Physician".
  - The owner can **add** a designation.
  - The owner can **remove** one. Doctors who already have it keep it, and it is only removed from the dropdown.
- When adding a doctor, the "Specialty" text box becomes a **"Designation" dropdown** that only lists what the owner created.
  - If no designations exist yet, show a hint: "Add a designation first".
- The prescription letterhead keeps showing the doctor's designation, as it does now.

**Tasks**

- [ ] New migration: `public.designations (id uuid pk, name text unique not null, created_at)`. RLS: owner can insert and delete, and signed-in staff can select.
- [ ] Keep storing the chosen name in `staff.specialty` as text. The letterhead, staff list and old doctors keep working, and removing a designation later does not break anyone.
- [ ] `owner/actions.ts`: add `addDesignation` and `removeDesignation` server actions (`requireRole("owner")`, zod, trimmed, max ~100 characters, no duplicates while ignoring case).
- [ ] `owner/actions.ts` `addStaff`: for a doctor, require a designation and check that it exists in the `designations` table.
- [ ] Staff page: add a small "Designations" card with the list, an add input and a remove button per item.
- [ ] `add-staff-form.tsx`: replace the Specialty `<input>` with a `<select name="specialty">` filled from the designations, and rename the label to "Designation".
- [ ] (Nice to have) Let the owner change an existing doctor's designation from the staff list.

---

## 5. Staff profile photo ✅

**Where:** the owner panel, Staff page (add staff form and staff list).

**What changes**

- The **Add staff** form gets a **profile photo** picker (optional), like a normal profile-picture upload:
  - a round preview of the chosen image before saving
  - jpg, png or webp, max ~2 MB
- The photo is shown wherever that staff member appears: the staff list (`Person` avatar), and the sidebar/header if it shows the signed-in user.
- If there is no photo, fall back to the current initials avatar.
- The owner can also **change or remove** the photo for existing staff from the staff list.

**Tasks**

- [ ] New migration: add `photo_path text` to `public.staff`.
- [ ] New migration: a storage bucket `staff-photos` (public read, since these are just staff headshots). Only the owner can upload or delete, through the service-role client in a server action.
- [ ] `add-staff-form.tsx`: add a file input with a preview and `encType="multipart/form-data"`.
- [ ] `owner/actions.ts` `addStaff`: validate the type and size, upload to `staff-photos/<staffId>.<ext>` after the staff row is created, and save `photo_path`. If the upload fails, keep the account and show a notice that the photo was not saved.
- [ ] `owner/actions.ts`: add `setStaffPhoto` and `removeStaffPhoto` actions for existing staff, and a "Change photo" control in the staff list.
- [ ] `staff/page.tsx`: also select `photo_path`, build the public URL and pass it to `Person`.
- [ ] `Person` component: render the image when a URL is given, otherwise the initials.
- [ ] `next.config.ts`: allow the Supabase storage host if `next/image` is used. A plain `<img>` also works.

---

# Landing page

## 6. Header: logo colour, nav layout, address ✅

**Where:** [components/site/sections/Header.tsx](components/site/sections/Header.tsx), the header styles in [app/(site)/site.css](app/(site)/site.css) (`.site-header`, `.wordmark`, `.hdr-*`), and the brand/nav copy in [lib/site/content.ts](lib/site/content.ts).

### 6a. Logo text colour

- **Today:** in the header wordmark "Derma**Soul**", only "Soul" (`<em>`) is gold (`--gold-soft`, or `--gold` when the header turns solid on scroll). "Derma" uses the header text colour.
- **Change:** "Derma" gets **the same colour as "Soul"**, so the whole word is gold, both on the transparent header and on the solid one after scrolling.
- [ ] `site.css`: set `.wordmark-text > span` to `color: var(--gold-soft)`, and `.is-solid .wordmark-text > span` to `var(--gold)`, matching the `em` rules.
- [ ] Check that the gold is still readable on the hero image and on the cream solid header.
- [ ] **Footer too:** the giant "DermaSoul" at the bottom of the page (`.foot-giant`, [Footer.tsx](components/site/sections/Footer.tsx)) gets the same treatment. "Derma" letters use `--gold-soft` like the `.soul` letters. Keep the italic on "Soul" only.

### 6b. Navbar layout

- **Today:** a 3-column header with the nav links on the left, the logo in the middle, and the Bag, "Patient Portal" and "Book a Consultation" on the right.
- **Change:** a 2-column header:
  - **Left:** the logo (mark and wordmark)
  - **Right:** **Treatments · Packages · Results · Reviews · About**, in this order
- **Remove** from the header: the Bag icon and count, "Patient Portal", and "Book a Consultation".
- [ ] `lib/site/content.ts` `nav`: reorder to Treatments, Packages, Results, Reviews, About.
- [ ] `Header.tsx`: put the wordmark first and the `nav` links in the right column, and delete the bag, portal and book links (and the `useBag`/`Bag` imports if they become unused).
- [ ] `site.css`: change `.site-header` to `grid-template-columns: auto 1fr`, with the links aligned to the end.
- [ ] Mobile (≤1100px): keep the hamburger menu with the same 5 links. Remove "Patient Portal" from the mobile menu list.
- [ ] The Bag/Shop and Portal **sections** on the page are not touched here, only the header links to them.

### 6c. Address

- The clinic address is **Banani, Dhaka**.
- [ ] `lib/site/content.ts` `brand.address`: replace the placeholder "142 Willow Street / Suite 3B / Dhaka, Bangladesh" with "Banani, Dhaka".
- [ ] Update the components that index into the address array (`Visit.tsx` uses `[0]`, `[1]` and `[2]`, `Hero.tsx` uses `[2]`), plus `Footer.tsx` and the mobile menu in `Header.tsx`, so nothing renders `undefined`.
- [ ] Use the same address on the prescription footer (feature 3).

---

## 7. Move the Doctors section up, before the dark Visit section ✅

**Where:** [app/(site)/page.tsx](app/(site)/page.tsx), which sets the section order.

- **Today:** Hero → Statement → **Visit** (dark, location) → Treatments → About → FeatureVideo → Packages → Results → **Team (Doctors)** → Certifications → Reviews → …
- **Change:** move **Team (Doctors)** to just before Visit:
  Hero → Statement → **Team (Doctors)** → **Visit** → Treatments → About → FeatureVideo → Packages → Results → Certifications → Reviews → …

**Tasks**

- [ ] `page.tsx`: move `<Team />` to between `<Statement />` and `<Visit />`.
- [ ] Update the comment about section order at the top of `Home()`.
- [ ] Check the transitions: Statement → Team → Visit (dark). Spacing, background colours and any scroll/reveal animations in `Team.tsx` that assume their old neighbours must still look right.
- [ ] No nav link points to `#team`, so nothing else needs to change.

---

## 16. Doctors section reads the real doctors from the DB ✅

**Where on the site:** the Doctors section ([Team.tsx](components/site/sections/Team.tsx)), which moves to the top in feature 7. Today it shows 4 hard-coded people from `team` in [lib/site/content.ts](lib/site/content.ts) (Dr. Nusrat Liza, Dr. Rafi Karim, Nadia Alam, Tamanna Rahim) as monogram cards.

**What changes**

- The section shows the **doctors already added in the owner panel** (`public.staff` where `role = 'doctor'` and `is_active`). No separate list is kept for the website.
- Each card shows:
  - **Photo**: the staff profile photo from feature 5. If a doctor has no photo, the current monogram card with their initials is used.
  - **Name**: `full_name`
  - **Designation**: `specialty`, the designation chosen in feature 4
- Adding, deactivating, or changing a doctor's photo/designation in the owner panel **updates the website automatically**.
- The **owner** can choose whether a doctor appears on the website at all, using a "Show on website" toggle in the staff list (on by default).
- Only doctors are shown. Nurses, receptionists and owners are not.

**Database**

- [ ] Migration: `alter table public.staff add column show_on_website boolean not null default true;`
- [ ] Migration: a **public view** that exposes only safe fields. Never expose the email or phone:
  ```sql
  create view public.website_doctors as
    select id, full_name, specialty, photo_path, created_at
    from public.staff
    where role = 'doctor' and is_active and show_on_website;
  grant select on public.website_doctors to anon, authenticated;
  ```
  (Or fetch server-side with the service-role client and select only these columns. The view is the cleaner option.)

**Owner panel**

- [ ] Staff list: add a "Show on website" toggle for doctor rows, with a `setStaffOnWebsite` server action (`requireRole("owner")`, `revalidatePath("/")`).
- [ ] `addStaff`, `setStaffActive`, `setStaffPhoto` / `removeStaffPhoto` and designation changes also call `revalidatePath("/")` so the site updates.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch from `website_doctors` ordered by `created_at` (earliest first, so the founder comes first), build the photo URLs and pass them to `<Team doctors={…} />`.
- [ ] `Team.tsx` `Member`: if `photoUrl` exists, render the photo inside the card (cover, keeping the tilt and glare effect); otherwise render the initials from `full_name`. Show the designation as `member-role`.
- [ ] Remove the hard-coded `team` array from `content.ts`. Keep `teamIntro`, and change its title to "Our Doctors" if only doctors are shown (the current heading is "Doctors & Practitioners").
- [ ] `team-grid` handles any count: 1–4 per row, centred when fewer.
- [ ] Hide the section if there are no doctors to show.

**Note:** the current cards also show credentials such as "MBBS, DDV". Staff records have no such field, so that line disappears. A "Qualifications" field can be added to the staff form later if wanted.

---

## 8. Treatments: remove the floating image on hover ✅

**Where:** [components/site/sections/Treatments.tsx](components/site/sections/Treatments.tsx) and the `.treat-*` styles in [app/(site)/site.css](app/(site)/site.css).

**Today:** hovering over a treatment row shows a large photo that follows the cursor, tilts, and swaps between rows (`.treat-float`). The other rows also fade to 35% (`.is-dim`).

**Change:** no image on hover. Use a **normal, simple hover** on the row instead:

- the row moves slightly to the right (the existing `padding-left` shift)
- the title turns gold and italic (existing)
- the arrow circle fills dark and rotates (existing)
- the other rows do **not** fade out, so the whole list stays readable

**Tasks**

- [ ] `Treatments.tsx`: remove the `.treat-float` block, `active` state, `onMove`/`onPointerLeave`/`onPointerEnter`, the `useMotionValue`/`useSpring` setup, and the `is-dim` class. Drop any imports that become unused (`motion`, `AnimatePresence`, etc.).
- [ ] `site.css`: delete the `.treat-float`, `.treat-float-img` and `.treat-row.is-dim` rules, and the `.treat-float` rule in the responsive block (~line 2433).
- [ ] Keep the `.treat-row:hover` rules (padding shift, gold italic title, arrow) as the hover effect.
- [ ] Rewrite the component's doc comment, which describes the floating photograph.
- [ ] **No pictures anywhere in Treatments, mobile included:** remove the `<span className="treat-thumb">` from each row, delete the `.treat-thumb` rules (desktop `display: none` and the mobile block ~line 2409), and remove `thumb` from the mobile `grid-template-areas`. Mobile row becomes `title arrow / body arrow`.
- [ ] Drop the `next/image` import from `Treatments.tsx` if it becomes unused. Leave `image` in `lib/site/content.ts` `treatments` alone (harmless), or remove it if nothing else reads it.

---

## 9. About section: new copy ✅

**Where:** the `about` object in [lib/site/content.ts](lib/site/content.ts) and [components/site/sections/About.tsx](components/site/sections/About.tsx). The layout (photo with shutters on the left, text on the right) stays the same. Only the text changes, plus two small additions for the closing lines.

**Exact copy.** Use it word for word, keeping the em dashes and the British spelling "centred":

> **About DermaSoul**
>
> We created DermaSoul with a simple belief: beautiful skin begins with healthy skin, and great care begins with understanding you.
>
> At DermaSoul, we bring together clinical dermatology and aesthetic medicine in a calm, personalized environment where every skin concern is approached with care, knowledge, and attention to detail.
>
> From everyday skin conditions and personalized skincare plans to advanced aesthetic treatments, our focus is never simply on following trends. Every treatment is chosen according to your skin, your needs, and your individual goals.
>
> We believe aesthetic medicine should enhance—not change—who you are. Our approach is centred on natural-looking results, evidence-based care, safety, and long-term skin health.
>
> Because your skin is more than what you see in the mirror.
> It is part of how you feel about yourself.
>
> — Dr. Nusrat Liza & the DermaSoul Team
>
> DermaSoul Medical Aesthetics
> We elevate your skin & confidence.

**How it maps onto the section**

| Part | Field | Display |
|---|---|---|
| "About DermaSoul" | heading (unchanged) | "About *DermaSoul*" as now |
| Paragraph 1 ("We created DermaSoul…") | `paragraphs[0]` | the larger lead paragraph (`about-lead`) |
| Paragraphs 2–4 | `paragraphs[1..3]` | normal body text |
| "Because your skin… / It is part of…" | new `closing: string[]` | two lines, italic serif and slightly larger, as a pull-quote |
| "— Dr. Nusrat Liza & the DermaSoul Team" | `signature` | existing `.signature` style |
| "DermaSoul Medical Aesthetics / We elevate your skin & confidence." | new `brandLine: { name, tagline }` | small caps and gold name, tagline under it, at the end of the copy |

**Tasks**

- [ ] `content.ts`: replace `about.paragraphs` with the 4 new paragraphs, update `signature` (capital "Team"), and add `closing` and `brandLine`.
- [ ] `About.tsx`: render `closing` (each line on its own line) after the paragraphs, then the signature, then `brandLine`, with the same `Reveal` stagger.
- [ ] `site.css`: add small styles for the closing quote and the brand line, reusing the existing serif, gold and kicker tokens.
- [ ] The text is now about twice as long, so check that the left photo column still lines up on desktop, and that mobile reads well.
- [ ] Keep the kicker "Our story" above the heading, unless asked to change it.

---

## 10. Remove the "Before & After Gallery" ✅

**Where:** [components/site/sections/Results.tsx](components/site/sections/Results.tsx), the `.gallery` / `.gal-*` styles in [app/(site)/site.css](app/(site)/site.css), and `gallery` / `galleryIntro` in [lib/site/content.ts](lib/site/content.ts).

**Today:** the Results section has two parts:
1. **"Transformative Results"**: the before/after comparison sliders (`.ba-grid`, `Compare`). This part **stays**.
2. **"Before & After Gallery"**: the horizontal, draggable strip of "Case 01, Case 02…" tiles (`<div className="gallery" id="gallery">`). This part **is removed**.

**Tasks**

- [ ] `Results.tsx`: delete the whole `<div className="gallery" id="gallery">…</div>` block.
- [ ] `Results.tsx`: remove the code that only served the gallery: the `track` ref, `limit` state, the resize/measure `useEffect`, and the `motion`/`gallery`/`galleryIntro` imports if they become unused.
- [ ] `content.ts`: remove `gallery` and `galleryIntro` if nothing else uses them.
- [ ] `site.css`: delete the `.gallery`, `.gallery-head`, `.gallery-viewport`, `.gallery-track`, `.gal-tile`, `.gal-split`, `.gal-half` and `.gal-roam` rules, including those in the responsive blocks.
- [ ] Check the roaming badge (`RoamingBadge`) still works, because it used `.gal-roam` as one of its anchors.
- [ ] Check the bottom spacing of the Results section after the gallery is gone, so the gap before the next section still looks right.
- [ ] Nothing links to `#gallery`, so no links need updating.

---

## 11. Remove the Patient Portal completely ✅

**Goal:** patients cannot sign in or sign up anywhere on the site. Only the staff console (`/admin/login`) stays.

**Today:** near the bottom of the landing page there is a "Patient Portal" section ([Portal.tsx](components/site/sections/Portal.tsx)) with a sign-in / create-account form. It is **front-end only**: the `onSubmit` does not call Supabase or any API, so no patient accounts exist and there is no data to migrate or delete.

**Tasks**

- [ ] `app/(site)/page.tsx`: remove `<Portal />` and its import, and drop "portal" from the section-order comment.
- [ ] Delete `components/site/sections/Portal.tsx`.
- [ ] `lib/site/content.ts`: delete the `portal` object.
- [ ] `site.css`: delete every `.portal*` rule (from ~line 2049), including any in the responsive blocks.
- [ ] Remove every link to `#portal`:
  - [ ] `Header.tsx`: the "Patient Portal" header link and the extra entry in the mobile menu (already planned in feature 6b)
  - [ ] `Footer.tsx`: the "Patient Portal" link (~line 46)
- [ ] Copy that mentions the portal:
  - [ ] `content.ts` FAQ "How do I access the patient portal?": **remove** this FAQ entry.
  - [ ] `content.ts` review (~line 182), "Booked through the patient portal…": ~~reword it~~ **moot**, because feature 18 replaces all hard-coded reviews with Google reviews.
- [ ] Check that no other code references `Portal`, `portal` or `#portal` (grep), and that `RoamingBadge` has no portal anchor.
- [ ] The staff login at `/admin/login` and `proxy.ts` are **not** touched.

---

# Super-admin dashboard: landing page content from the DB

General approach for every "comes from the DB" item below:

- The owner manages it from a new **"Website"** area in the owner panel (`/admin/owner/website`), linked from the owner dashboard next to Staff. Each landing-page item gets its own card/tab there.
- The data lives in Supabase tables with RLS: **anyone (anon) can read** active rows, and **only the owner** can write (through server actions with `requireRole("owner")`).
- The landing page (`app/(site)/page.tsx`) is a server component. It reads the rows there and passes them as props into the client sections. After any owner change, the action calls `revalidatePath("/")` so the site updates immediately.
- If a table is empty, the section/strip hides itself instead of showing placeholders.

## 12. "As seen in" press links ✅

**Where on the site:** the "As seen in" marquee under the brand statement ([Statement.tsx](components/site/sections/Statement.tsx), `.press`). Today it scrolls 4 hard-coded names from `press` in [lib/site/content.ts](lib/site/content.ts) ("City & Skin Journal", …), which are not links.

**What changes**

- Each entry is an **article** the clinic was featured in, with:
  - **Title**: the text shown in the marquee, e.g. "The Daily Star — Skin care in Dhaka"
  - **Link**: the article URL
- On the landing page, **clicking a title opens the article link** in a new tab.
- The owner can **add, edit, delete, reorder and show/hide** entries from the dashboard.

**Database**

> **Update (see feature 17):** "Certifications & Societies" needs exactly the same title + link shape. Build **one shared table** `public.site_links` with a `kind text not null check (kind in ('press','certification'))` column instead of a press-only table, and share the admin UI and actions between the two. The schema below otherwise applies as written, with `press_articles` read as `site_links where kind = 'press'`.

- [ ] New migration `…_press_articles.sql`:
  ```sql
  create table public.press_articles (
    id          uuid primary key default gen_random_uuid(),
    title       text not null check (char_length(title) between 1 and 120),
    url         text not null check (url ~* '^https?://'),
    sort_order  int  not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );
  alter table public.press_articles enable row level security;
  -- anon + staff: read active rows; owner: full access
  ```
- [ ] RLS policies: `select` for `anon, authenticated` where `is_active`; `select/insert/update/delete` for the owner (same owner check the other migrations use).
- [ ] Seed nothing. The strip stays hidden until the owner adds the first article.

**Owner dashboard**

- [ ] New page `app/(console)/admin/(desk)/owner/website/page.tsx`, plus a link to it from the owner dashboard.
- [ ] "As seen in" card:
  - a list of articles showing the title, the link (opens in a new tab) and an active toggle, with ↑/↓ to reorder, Edit and Delete
  - an add form with **Title** and **Link**
- [ ] Server actions in `owner/actions.ts` (or a new `owner/website/actions.ts`): `addPressArticle`, `updatePressArticle`, `deletePressArticle`, `movePressArticle`, `setPressArticleActive`. Each one uses `requireRole("owner")` and zod (title 1–120 chars, `url` must be a valid http(s) URL), then `revalidatePath("/")` and `revalidatePath("/admin/owner/website")`.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the active `press_articles` ordered by `sort_order, created_at` and pass them to `<Statement press={…} />`.
- [ ] `Statement.tsx`: render each `press-name` as `<a href={url} target="_blank" rel="noopener noreferrer">{title}</a>`. In the duplicated marquee group (`aria-hidden`), give the links `tabIndex={-1}` so keyboard users don't tab through each article twice.
- [ ] Pause the marquee on hover so a title can be clicked. Add a hover style (gold / underline) on the link.
- [ ] Hide the whole `.press` strip when there are no articles.
- [ ] Remove the hard-coded `press` array from `content.ts`.

---

## 17. "Certifications & Societies" from the DB, as links ✅

**Where on the site:** the "Certifications & Societies" section ([Certifications.tsx](components/site/sections/Certifications.tsx)), with two marquee rows running in opposite directions and pausing on hover. Today it shows 5 hard-coded names from `certs` in [lib/site/content.ts](lib/site/content.ts) ("Board Certified Dermatology", "American Academy of Dermatology"…), each with an icon. They are not links.

**What changes:** it works exactly like "As seen in" (feature 12).

- Each entry has a **Title** (e.g. "Bangladesh Society of Dermatologists") and a **Link** (e.g. the society's or certificate's page).
- On the landing page, **clicking a title opens the link** in a new tab.
- The owner can **add, edit, delete, reorder and show/hide** entries from the dashboard.

**Database**

- [ ] Use the shared `public.site_links` table from feature 12 with `kind = 'certification'`. No separate table is needed.
  ```sql
  create table public.site_links (
    id          uuid primary key default gen_random_uuid(),
    kind        text not null check (kind in ('press','certification')),
    title       text not null check (char_length(title) between 1 and 120),
    url         text not null check (url ~* '^https?://'),
    sort_order  int  not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );
  create index site_links_kind_order_idx on public.site_links (kind, sort_order);
  ```
- [ ] RLS: public select of active rows, full access for the owner (same as the other site tables).
- [ ] No seed. The current names are template placeholders (e.g. American societies), so the section stays hidden until the owner adds real ones.

**Owner dashboard** (`/admin/owner/website`, "Certifications & Societies" card)

- [ ] The same card component as "As seen in", parameterised by `kind`: a list (title, link, active toggle, ↑/↓, Edit, Delete) plus an add form (Title, Link).
- [ ] The same server actions as feature 12, generalised: `addSiteLink(kind, …)`, `updateSiteLink`, `deleteSiteLink`, `moveSiteLink`, `setSiteLinkActive`. They use `requireRole("owner")` and zod (http(s) URL), then `revalidatePath("/")`.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the active `site_links` once, split them by `kind`, and pass `press` to `<Statement />` and `certifications` to `<Certifications />`.
- [ ] `Certifications.tsx`: render each `cert-chip` as `<a href={url} target="_blank" rel="noopener noreferrer">` with a hover style. Links in the `aria-hidden` duplicate groups and the reversed row get `tabIndex={-1}`.
- [ ] Icons: `certIcons[i]` is indexed by position, and there are only 5. Use `certIcons[i % certIcons.length]` so any number of entries works.
- [ ] With only 1–2 entries, a single marquee row looks thin. Show both rows only when there are ≥ 4 entries, otherwise one row.
- [ ] Remove the hard-coded `certs` array from `content.ts`. Keep `certsIntro`.
- [ ] Hide the section if there are no entries.

---

## 18. Reviews pulled from Google (Places API) ✅

**Where on the site:** the dark Reviews section ([Reviews.tsx](components/site/sections/Reviews.tsx)). On the left it shows a big score that counts up, ★★★★★ and "Based on N reviews". On the right, one large quote at a time, with progress rails and ←/→. Today everything comes from the hard-coded `reviewsSummary` (4.8 / 94) and the 3 placeholder `reviews` in [lib/site/content.ts](lib/site/content.ts).

**Decision:** use the **Google Places API (New)**, option 1. Scraping Google is against its terms and is not used. The Business Profile API (all reviews, needs owner OAuth plus Google approval) and manually entered reviews are **not** being built now and may come later.

**What changes**

- The section shows the clinic's **real Google data**:
  - **Rating**: e.g. 4.8, the real average (`rating`)
  - **Review count**: "Based on N Google reviews" (`userRatingCount`)
  - **Reviews**: up to **5**. Google returns at most 5 and picks them itself (most relevant), so we cannot choose which.
- Each quote shows the review text, the reviewer's name (linked to their Google profile), their Google profile photo if available (otherwise the initial, as now), the star rating, and the relative time ("3 months ago").
- A **"See all reviews on Google"** button opens the clinic's Google Maps page (`googleMapsUri`).
- A small **"Reviews from Google"** attribution with the Google logo/wordmark, which Google's terms require.
- The data refreshes automatically every few hours. Nobody has to update it by hand.

**Setup, one time (outside the code)**

- [ ] Create a Google Cloud project, enable **Places API (New)**, enable billing (a card is required; at this site's traffic the cost should be negligible), and create an **API key** restricted to the Places API (New).
- [ ] Find the clinic's **Place ID** (Google's "Place ID Finder", or one Text Search call with the clinic name and address).
- [ ] Add `GOOGLE_PLACES_API_KEY` to `.env.local`, `.env.example` (empty) and the Vercel env vars. It is **server-only**: never prefix it with `NEXT_PUBLIC_`.

**Owner dashboard** (`/admin/owner/website`, "Google reviews" card)

- [ ] A **Google Place ID** field, plus a read-only preview of what Google currently returns (rating, count, the 5 reviews), so the owner can confirm it is the right place.
- [ ] A **minimum stars to show** setting (default **4**). Reviews below this are hidden on the site. The overall rating and count are always Google's real numbers.
- [ ] A "Refresh now" button that calls `revalidateTag("google-reviews")`.
- [ ] Storage: a small key-value table, since this is not a list:
  ```sql
  create table public.site_settings (
    key        text primary key,
    value      jsonb not null,
    updated_at timestamptz not null default now()
  );
  -- row: key = 'google_reviews', value = {"placeId": "...", "minRating": 4}
  ```
  RLS: owner-only read and write. The landing page reads it server-side, so anon doesn't need access. The table can be reused later for other site-wide settings, such as the clinic phone from feature 3.

**Server code**

- [ ] `lib/site/google-reviews.ts` (server-only): `getGoogleReviews(placeId)` calls
  `GET https://places.googleapis.com/v1/places/{placeId}` with headers `X-Goog-Api-Key` and
  `X-Goog-FieldMask: rating,userRatingCount,reviews,googleMapsUri`, plus `languageCode=en`.
  - Use `fetch(..., { next: { revalidate: 21600, tags: ["google-reviews"] } })` so Google is called at most every ~6 h, not on every visit.
  - Map each review to `{ text, rating, author, authorUrl, photoUrl, when }`, using `text.text` (or `originalText.text` if a translation is missing) and `relativePublishTimeDescription`.
  - On **any** error (missing key, bad Place ID, quota, network), return `null` and log it. **The page must never break** because of Google.
- [ ] `app/(site)/page.tsx`: read `site_settings.google_reviews`, call `getGoogleReviews`, filter by `minRating`, and pass the result to `<Reviews data={…} />`.

**Landing page**

- [ ] `Reviews.tsx`: take `{ rating, count, reviews, mapsUrl }` as props instead of the `content.ts` imports. Count up to the real `rating`. Show the real stars (e.g. 4.5, with a partial star) instead of a fixed ★★★★★.
- [ ] Quote footer: Google profile photo (`<img>`, `referrerPolicy="no-referrer"`) with the initial as fallback, the name as a link to `authorUrl`, small stars for that review, and `when`.
- [ ] Long reviews: clamp to ~6 lines with a "Read more on Google" link, so the slide height stays stable.
- [ ] Add the "See all reviews on Google" button and the "Reviews from Google" attribution.
- [ ] Rails/arrows adapt to however many reviews come back (0–5). With exactly 1 review, hide the rails and arrows.
- [ ] If `getGoogleReviews` returns `null`, or no review passes the filter, **hide the whole section**, rather than showing fake reviews.
- [ ] Remove the hard-coded `reviews` and `reviewsSummary` from `content.ts`.
- [ ] `next.config.ts`: only needed if `next/image` is used for the Google profile photos (`lh3.googleusercontent.com`). A plain `<img>` avoids it.

**Pending from the user**

- The clinic's **Google Maps link** (to find the Place ID).
- Who creates the Google Cloud project and API key: the user, or step-by-step instructions written by me.

---

## 19. Shop products from the DB ✅

**Where on the site:** the "Skincare Shop" section ([Shop.tsx](components/site/sections/Shop.tsx)). Today it is a grid of hard-coded `products` from [lib/site/content.ts](lib/site/content.ts) ("Barrier Repair Cream $42"…), each with an image, name, price and an "Add to Bag" button.

**What changes**

- The owner manages products from the dashboard. Each product has:
  - **Title**: optional
  - **Description**: optional (new, shown under the title, clamped to ~3 lines)
  - **Price**: optional, free text (e.g. "৳ 1,800"). Hidden if empty.
  - **Image**: optional. If empty, the card shows a soft placeholder tile with the brand mark.
- **All fields are optional for now**, but a product must have **at least a title or an image** so the card is never completely blank. The form says so if both are empty.
- The **"Add to Bag" button is removed**. The bag has no checkout, and its header icon is removed in feature 6b. The cards are display-only for now.

**Database**

- [ ] New migration `…_products.sql`:
  ```sql
  create table public.products (
    id          uuid primary key default gen_random_uuid(),
    title       text check (title is null or char_length(title) between 1 and 120),
    description text check (description is null or char_length(description) <= 1000),
    price       text check (price is null or char_length(price) between 1 and 60),
    image_path  text,
    sort_order  int  not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    constraint products_not_blank check (title is not null or image_path is not null)
  );
  alter table public.products enable row level security;
  ```
- [ ] RLS: same as the other site tables (public select of active rows, full access for the owner).
- [ ] Images go in the `site-media` bucket (feature 14) under `site-media/products/<id>.<ext>`.
- [ ] No seed. The current products are template placeholders with $ prices, so the section stays hidden until the owner adds products.

**Owner dashboard** (`/admin/owner/website`, "Shop" card)

- [ ] A list showing a thumbnail, title, price and an active toggle, with ↑/↓, Edit and Delete.
- [ ] An add/edit form with Title, Description (textarea), Price and Image (picker with preview, removable). Every field is optional, but at least a title or an image is required.
- [ ] Server actions: `addProduct`, `updateProduct`, `deleteProduct` (also deletes the image), `moveProduct`, `setProductActive`. Each uses `requireRole("owner")` and zod, then `revalidatePath("/")`.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the active products and pass them to `<Shop products={…} />`.
- [ ] `Shop.tsx`: render from props, add the description, show the price only if set, use the placeholder tile when there is no image, and remove "Add to Bag" and the `useBag` import.
- [ ] Remove the bag entirely if nothing else uses it: `components/site/Bag.tsx`, `BagProvider` in `page.tsx`, and `.product-add` / `.hdr-bag*` CSS.
- [ ] Remove the hard-coded `products` from `content.ts`. Keep `shopIntro`.
- [ ] Hide the section if there are no products.

**Decided:** no ordering, WhatsApp or cart. Products are display-only. Clicking one only opens its details (see below).

**"See more" page + product details modal** (same pattern as Treatments, feature 13)

- [ ] **Landing page:** show only the **first 4** products (one row of the current 4-column grid), plus a **"See more"** button to `/products`. Clicking a product goes to `/products?p=<id>` and opens its modal.
- [ ] **New route `app/(site)/products/page.tsx`:** fetches all active products and reuses the site header, footer and styles. It shows a responsive grid (4 / 2 / 1 columns) of the same product cards.
- [ ] **Clicking a product opens a modal** showing the large image (or placeholder), title, price (if set) and the **full description** (`whitespace-pre-line`). It closes on ✕, Esc or a click outside. The URL updates with `?p=<id>` so a product can be linked directly.
- [ ] On the cards, the description is clamped to ~2 lines. The full text only appears in the modal.
- [ ] Reuse the modal component built for Treatments (feature 13). Build it once as a generic `SiteModal`.
- [ ] `metadata`: a title like "Shop — DermaSoul".
- [ ] `revalidatePath("/products")` in every product action.

---

## 20. Instagram: main profile link and posts from the DB ✅

**Where on the site:** the Instagram strip ([Social.tsx](components/site/sections/Social.tsx)), which has a handle, a "View on Instagram" button and a grid of photo tiles. There is also the floating Instagram button (`FabInstagram` in [Footer.tsx](components/site/sections/Footer.tsx)). Today the profile link is the placeholder `https://instagram.com`, the handle is `@dermasoul.aesthetics` (`brand` in [lib/site/content.ts](lib/site/content.ts)), and every tile links to the same profile URL.

**What changes**

- **Main Instagram profile** (one value, set in the dashboard):
  - **Profile link**, e.g. `https://www.instagram.com/dermasoul.aesthetics/`
  - **Handle**: optional. If empty, it is worked out from the link (`@dermasoul.aesthetics`).
  - Used by the section heading/handle, the "View on Instagram" button and the floating Instagram button.
- **Instagram posts** (a list the owner manages):
  - **Image**: **required**, uploaded from the dashboard
  - **Instagram post link**: **required**, e.g. `https://www.instagram.com/p/XXXX/`
  - On the site, **clicking a tile opens that specific post** on Instagram in a new tab.

**Database**

- [ ] Main profile: store it in the `site_settings` table (feature 18) as `key = 'instagram'`, `value = {"url": "...", "handle": "..."}`. The landing page needs to read it, so either add an anon `select` policy limited to the public keys (`instagram`), or read it server-side with the service-role client.
- [ ] Posts, new migration `…_instagram_posts.sql`:
  ```sql
  create table public.instagram_posts (
    id          uuid primary key default gen_random_uuid(),
    image_path  text not null,
    url         text not null check (url ~* '^https://(www\.)?instagram\.com/'),
    sort_order  int  not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );
  alter table public.instagram_posts enable row level security;
  ```
- [ ] RLS: same as the other site tables.
- [ ] Images go in `site-media/instagram/<id>.<ext>`.

**Owner dashboard** (`/admin/owner/website`, "Instagram" card)

- [ ] Top: a **Profile link** input (must be an `instagram.com` URL) and an optional **Handle**, with a Save button.
- [ ] Below: a **Posts** list showing a thumbnail, the post link (opens in a new tab) and an active toggle, with ↑/↓, Edit and Delete. The add form has **Image** (required, with preview) and **Post link** (required).
- [ ] A hint: "The grid looks best with 6 posts."
- [ ] Server actions: `saveInstagramProfile`, `addInstagramPost`, `updateInstagramPost`, `deleteInstagramPost` (also deletes the image), `moveInstagramPost`, `setInstagramPostActive`. Each uses `requireRole("owner")` and zod, then `revalidatePath("/")`.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the profile setting and the active posts, then pass them to `<Social />` and to the floating button in `Footer.tsx`.
- [ ] `Social.tsx`: handle and button use the profile link, and each tile uses `href={post.url}` with `target="_blank" rel="noopener noreferrer"`.
- [ ] Remove `brand.instagram`, `brand.handle` and `social.tiles` from `content.ts`. Keep the `social.kicker` copy.
- [ ] If no posts exist but the profile link is set, show just the heading and the "View on Instagram" button, without the grid. If there is no profile link either, hide the section and the floating button.

---

## 21. "Book a Consultation" opens an inquiry form; inquiries show in the dashboard ✅

**Today:** every "Book a Consultation" / "Book" button links to `#cta`. The CTA section's big button ([Cta.tsx](components/site/sections/Cta.tsx)) is just a `mailto:` link to the placeholder `brand.email`. There is no form, and nothing is saved.

**What changes**

- Every booking button on the site goes to a new **`/inquiry`** page with a short form:
  - **Name**: required
  - **Email**: required, validated
  - **Message**: required, multi-line (what they want to ask or book)
  - **Submit**, then a thank-you message: "Thanks, we've received your inquiry and will get back to you by email."
- When the visitor came from a specific treatment or package, the message is pre-filled with e.g. "I'm interested in: Acne Scar Treatment" (`/inquiry?about=<title>`). They can edit it.
- The inquiry is saved in the database, and the owner sees it in the dashboard under **"Inquiries"**.

**Database**

- [ ] New migration `…_inquiries.sql`:
  ```sql
  create table public.inquiries (
    id          uuid primary key default gen_random_uuid(),
    name        text not null check (char_length(name) between 1 and 120),
    email       text not null check (char_length(email) between 3 and 254),
    message     text not null check (char_length(message) between 1 and 3000),
    is_read     boolean not null default false,
    created_at  timestamptz not null default now()
  );
  create index inquiries_created_idx on public.inquiries (created_at desc);
  alter table public.inquiries enable row level security;
  ```
- [ ] RLS: **no** anon access at all, because the public form inserts through a server action with the service-role client after validation. The owner has select, update and delete.

**Public form**

- [ ] New route `app/(site)/inquiry/page.tsx`, in the site style (header, footer, cream background, serif heading "Book a Consultation"). Include the clinic address (Banani, Dhaka) and hours beside the form.
- [ ] Server action `submitInquiry` (`app/(site)/inquiry/actions.ts`):
  - zod: trim everything, name 1–120 characters, a valid email, message 1–3000 characters.
  - **Spam protection:** a hidden honeypot field (reject if filled), plus a minimum time-on-page check (a submit < 3 s after render is rejected), plus a simple rate limit: max ~5 inquiries per email or IP per hour, checked against `inquiries` (`x-forwarded-for` on Vercel).
  - Insert with the service-role client, then `revalidatePath("/admin/owner/inquiries")`.
  - Return field errors inline. Never expose DB errors.
- [ ] Use `useActionState` for pending/disabled submit, inline errors and the success state. The form is cleared after success.
- [ ] `metadata`: a title like "Book a Consultation — DermaSoul".

**Point every booking button to `/inquiry`**

- [ ] `Cta.tsx`: the "Book a Consultation" orb goes to `/inquiry` instead of `mailto:`.
- [ ] `Hero.tsx` (~line 90), `Visit.tsx` (~line 68) and `RoamingBadge.tsx` (~line 141): change `#cta` to `/inquiry`.
- [ ] Treatments modal (feature 13), Packages "Book" buttons (feature 14): change to `/inquiry?about=<title>`.
- [ ] `Treatments.tsx` row links (currently `#cta`) are already replaced by `/treatments?t=<id>` in feature 13.
- [ ] `Header.tsx`: the header "Book a Consultation" button is already removed in feature 6b.
- [ ] Remove `brand.email` / the `mailto` if nothing else uses them, and check `Footer.tsx` and the mobile menu.

**Owner dashboard: "Inquiries"**

- [ ] New page `app/(console)/admin/(desk)/owner/inquiries/page.tsx`, linked from the owner dashboard with an **unread count badge** (e.g. "Inquiries · 3 new").
- [ ] A list, newest first, showing the name, email, the first line of the message, the date/time (clinic timezone, `formatClinicDate`/`formatClinicTime`), and **unread rows in bold** with a dot.
- [ ] Clicking a row expands it (or opens a panel) to show the full message (`whitespace-pre-line`). Opening it marks it **read**.
- [ ] Per inquiry: **Reply** (`mailto:<email>?subject=Re: your inquiry to DermaSoul`), **Mark unread**, **Delete** (with confirm).
- [ ] Filter tabs: **All / Unread**. Paginate or "Load more" after ~50.
- [ ] Server actions: `setInquiryRead`, `deleteInquiry`, both with `requireRole("owner")`.
- [ ] (Nice to have) Realtime: the dashboards already use Supabase realtime, so subscribe to `inquiries` inserts and bump the badge live.

**Open question**

- Should only the **owner** see inquiries, or the **receptionist** too, since they handle bookings? The plan assumes owner only.

---

## 22. Opening hours: open every day, 11:30 am – 8:00 pm ✅

**Today:** `brand.hours` in [lib/site/content.ts](lib/site/content.ts) is the template placeholder `["Tue–Sat, 10am–6pm", "Closed Sun & Mon"]`.

**Change:** the clinic is **open every day, 11:30 am – 8:00 pm**. It has no closed days.

**Tasks**

- [ ] `content.ts`: `hours: ["Open every day", "11:30 am – 8:00 pm"]`.
- [ ] Check every place that renders the hours, so that one line or two lines both read naturally:
  - [ ] `Hero.tsx` (~line 102) shows `brand.hours[0]` only, which would show just "Open every day". Change it to show both, e.g. "Open every day · 11:30 am – 8:00 pm".
  - [ ] `Header.tsx` mobile menu (~line 130) also shows `brand.hours[0]` only. Fix it the same way.
  - [ ] `Visit.tsx` (~line 56) and `Footer.tsx` (~line 34) map over all lines, so they are fine. Just check the layout.
- [ ] The `/inquiry` page (feature 21) shows the same hours beside the form.
- [ ] Use one format everywhere: "11:30 am – 8:00 pm" (12-hour time, en dash). This is Bangladesh time (Asia/Dhaka), so no timezone label is needed.
- [ ] (Optional) If structured data (JSON-LD `openingHours`) is added later for Google, use `Mo-Su 11:30-20:00`.

---

## 13. Treatments from the DB, a "See more" page and a description modal ✅

**Where on the site:** the Treatments section on the landing page ([Treatments.tsx](components/site/sections/Treatments.tsx)), which today shows 6 hard-coded rows from `treatments` in [lib/site/content.ts](lib/site/content.ts), plus a **new page** `/treatments`. This builds on feature 8 (no pictures, simple hover).

**What changes**

- Each treatment has just two fields:
  - **Title**, e.g. "Acne & Acne Scar Treatment"
  - **Description**: the full text about the treatment. It can be several paragraphs long.
- **Landing page:**
  - shows only the **first 6** treatments (by the owner's order)
  - each row shows the title and **only the first 1–2 sentences** of the description
  - a **"See more"** button under the list goes to `/treatments`
  - clicking a row goes to `/treatments` and opens that treatment's modal directly (`/treatments?t=<id>`)
- **`/treatments` page:**
  - lists **all** active treatments, in the same style as the landing list (title + short excerpt)
  - clicking a treatment **opens a modal** with the title and the **full description**
  - the modal closes on ✕, Esc or a click outside, and the URL updates (`?t=<id>`) so a treatment can be linked or shared directly
  - a "Book a Consultation" button inside the modal goes to `/#cta`

**Database**

- [ ] New migration `…_treatments.sql`:
  ```sql
  create table public.treatments (
    id          uuid primary key default gen_random_uuid(),
    title       text not null check (char_length(title) between 1 and 120),
    description text not null check (char_length(description) between 1 and 5000),
    sort_order  int  not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );
  alter table public.treatments enable row level security;
  ```
- [ ] RLS: same as `press_articles`, so anon/authenticated can select active rows and the owner has full access.
- [ ] Seed the 6 current treatments from `content.ts` (title + body as the description) so the site isn't empty after the migration.

**Owner dashboard** (`/admin/owner/website`, "Treatments" card)

- [ ] A list of treatments showing the title, the first line of the description and an active toggle, with ↑/↓ to reorder, Edit and Delete.
- [ ] An add/edit form with **Title** (input) and **Description** (multi-line textarea). Line breaks are kept.
- [ ] A short hint under the textarea: "The first 1–2 sentences are shown on the landing page."
- [ ] Server actions: `addTreatment`, `updateTreatment`, `deleteTreatment`, `moveTreatment`, `setTreatmentActive`. Each uses `requireRole("owner")` and zod, then `revalidatePath("/")`, `revalidatePath("/treatments")` and the dashboard path.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the first 6 active treatments plus the total count, and pass them to `<Treatments />`.
- [ ] `lib/site/excerpt.ts`: add `excerpt(text, maxSentences = 2)` to cut the description after the 2nd sentence (`. ! ?`), with a ~220-character hard cap and "…". Use the same helper on both pages.
- [ ] `Treatments.tsx`: render the rows from props (title + excerpt) and link each row to `/treatments?t=<id>`. Add a **"See more"** button (`/treatments`) under the list, shown only if there are more than 6, or always if preferred.
- [ ] Remove the hard-coded `treatments` array (and `image`) from `content.ts`. Keep `treatmentsIntro`.
- [ ] Hide the section if there are no treatments.

**`/treatments` page**

- [ ] New route `app/(site)/treatments/page.tsx` (server). It fetches all active treatments and reuses the site header, footer and styles.
- [ ] A client component for the list and the modal. It reads `?t=` on load to open the matching modal, and uses `router.replace` when opening or closing it.
- [ ] Modal: an accessible dialog (`role="dialog"`, focus trap, Esc to close, body scroll locked, which also stops Lenis smooth scroll) with the full description in `whitespace-pre-line`.
- [ ] `metadata`: a title like "Treatments — DermaSoul".

**Navigation fix**

- [ ] Header and footer links are `#treatments`, `#packages`… and break on `/treatments`. Change them to `/#treatments` etc. so they work from any page (`lib/site/content.ts` `nav` and the footer links).

**Open question**

- Should the landing page show **6** treatments before "See more", or a different number?

---

## 14. Packages from the DB, with a "See more" page ✅

**Where on the site:** the Packages section on the landing page ([Packages.tsx](components/site/sections/Packages.tsx)), which today shows 3 hard-coded packages from `packages` in [lib/site/content.ts](lib/site/content.ts) as sticky stacked cards with a looping **video**, a tier ("Starter"…), name, body, and a **price** ("$180 / session"). There is also a **new page** `/packages`.

**What changes**

- Each package has:
  - **Title** (required)
  - **Description** (required, multi-line)
  - **Image** (required): uploaded from the dashboard. It replaces the video.
  - **Price** (**optional**): free text, e.g. "৳ 12,000" or "৳ 4,500 / session". If it is empty, **no price is shown** at all, so no empty space and no "$".
- The **tier** label ("Starter", "Signature"…) and the per-card video are removed.
- **Landing page:**
  - shows only the **first 3** packages (by the owner's order), keeping the current stacked-card look, with the image in place of the video
  - a **"See more"** button under the stack goes to `/packages`
- **`/packages` page:**
  - shows **all** active packages as a grid of cards: image, title, full description, and the price if there is one
  - each card has a "Book" button that goes to `/#cta`

**Database & storage**

- [ ] New migration `…_packages.sql`:
  ```sql
  create table public.packages (
    id          uuid primary key default gen_random_uuid(),
    title       text not null check (char_length(title) between 1 and 120),
    description text not null check (char_length(description) between 1 and 3000),
    image_path  text not null,
    price       text check (price is null or char_length(price) between 1 and 60),
    sort_order  int  not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );
  alter table public.packages enable row level security;
  ```
- [ ] RLS: same as `press_articles` / `treatments` (public select of active rows, full access for the owner).
- [ ] Storage: a **public** bucket `site-media` for website images. Owner-only upload and delete through server actions. Packages go under `site-media/packages/<id>.<ext>`. Future site images can use the same bucket.
- [ ] Seed the 3 current packages (title, body as the description, price left empty) with the current poster images uploaded as their image, so the site isn't empty.

**Owner dashboard** (`/admin/owner/website`, "Packages" card)

- [ ] A list of packages showing an image thumbnail, title, price (or "—") and an active toggle, with ↑/↓ to reorder, Edit and Delete.
- [ ] An add/edit form with **Title**, **Description** (textarea), **Image** (file picker with preview, jpg/png/webp, max ~5 MB) and **Price** (optional, placeholder "Leave empty to hide price"). When editing, the current image is kept unless a new one is chosen.
- [ ] Server actions: `addPackage`, `updatePackage`, `deletePackage` (also deletes the image file), `movePackage`, `setPackageActive`. Each uses `requireRole("owner")` and zod, then `revalidatePath("/")`, `revalidatePath("/packages")` and the dashboard path.

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the first 3 active packages plus the total count, build the public image URLs and pass them to `<Packages />`.
- [ ] `Packages.tsx`: render from props, swap `<video>` for `next/image` (or `<img>`), drop the tier, and only render `.pkg-price` when a price exists. Add a **"See more"** button to `/packages`.
- [ ] The `0X / 0N` counter on each card counts only the cards shown on the landing page.
- [ ] Remove the hard-coded `packages` array from `content.ts` and the package videos/posters under `public/` if nothing else uses them. Keep `packagesIntro`, but its body "…priced as a whole." mentions pricing, so reword it to e.g. "Multi-session plans built around common goals."
- [ ] Hide the section if there are no packages.
- [ ] `next.config.ts`: allow the Supabase storage host in `images.remotePatterns` if `next/image` is used.

**`/packages` page**

- [ ] New route `app/(site)/packages/page.tsx` (server). It fetches all active packages and reuses the site header, footer and styles.
- [ ] Responsive card grid: 3 columns on desktop, 2 on tablet, 1 on mobile. Show the description with `whitespace-pre-line`.
- [ ] `metadata`: a title like "Packages — DermaSoul".
- [ ] It relies on the `/#…` nav-link fix from feature 13.

---

## 15. "Transformative Results" from the DB, with real before/after photos ✅

**Where on the site:** the "Transformative Results" part of the Results section ([Results.tsx](components/site/sections/Results.tsx), `Compare` and `.ba-grid`). Today it shows 3 hard-coded items from `results` in [lib/site/content.ts](lib/site/content.ts). Each one uses a **single** placeholder photo for both sides, and "before" is just a grey filter. (The "Before & After Gallery" below it is removed in feature 10.)

**What changes**

- Each result has:
  - **Before image**: **required**
  - **After image**: **required**
  - **Title**: required, e.g. "Acne Scar Treatment" (shown as the caption under the slider)
  - **Description**: optional, a short line or two under the title, e.g. "3 sessions over 8 weeks"
- The slider works as now: drag the divider, or use ←/→, to compare. The left side shows the real **before** photo and the right side the real **after** photo. The fake grey filter is removed.
- **Landing page:** shows **all active** results in the existing 3-column grid (which wraps to more rows). The owner controls what shows by using the active toggle and the order.

**Database & storage**

- [ ] New migration `…_results.sql`:
  ```sql
  create table public.results (
    id                uuid primary key default gen_random_uuid(),
    title             text not null check (char_length(title) between 1 and 120),
    description       text check (description is null or char_length(description) <= 500),
    before_image_path text not null,
    after_image_path  text not null,
    sort_order        int  not null default 0,
    is_active         boolean not null default true,
    created_at        timestamptz not null default now()
  );
  alter table public.results enable row level security;
  ```
- [ ] RLS: same as the other site tables (public select of active rows, full access for the owner).
- [ ] Images go in the `site-media` bucket (feature 14) under `site-media/results/<id>-before.<ext>` and `…-after.<ext>`.
- [ ] **No seed.** The current items are placeholders (one photo for both sides), so the section stays hidden until the owner uploads real before/after pairs.

**Owner dashboard** (`/admin/owner/website`, "Results" card)

- [ ] A list of results showing small before/after thumbnails side by side, title and an active toggle, with ↑/↓ to reorder, Edit and Delete.
- [ ] An add/edit form with:
  - **Before image** and **After image**: two file pickers side by side, each with a preview. Both are **required** when adding, and the form cannot be submitted without them. When editing, the existing images are kept unless replaced.
  - **Title** (required) and **Description** (optional textarea).
  - jpg/png/webp, max ~5 MB each.
  - A hint: "Use photos taken from the same angle and crop so the slider lines up."
- [ ] Server actions: `addResult`, `updateResult`, `deleteResult` (also deletes both image files), `moveResult`, `setResultActive`. They use `requireRole("owner")` and zod, and validate on the server that **both** files are present when adding. Then `revalidatePath("/")` and the dashboard path.
- [ ] A small consent reminder next to the form: "Only upload photos the patient has consented to share."

**Landing page**

- [ ] `app/(site)/page.tsx`: fetch the active results ordered by `sort_order`, build the public URLs and pass them to `<Results />`.
- [ ] `Compare`: take `before`, `after`, `title` and `description` props. Show `after` in `.ba-after` and `before` in the clipped `.ba-before`, and remove the grey filter CSS on `.ba-before`. Show the description under the caption when present.
- [ ] Use `title` in the slider's `aria-label`, and set `alt` on the images (e.g. "Before — <title>", "After — <title>").
- [ ] `content.ts`: remove the `results` array. In `resultsIntro.body`, remove "Placeholder visuals — real client photography (with consent) replaces these.", keeping "Drag each divider to compare before and after." Keep the "Individual results vary…" note.
- [ ] Hide the whole Results section when there are no results. Also hide the "Results" nav link then, or leave it, since it is harmless if the section is gone. Decide during the build.

---
