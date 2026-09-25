-- The doctor's prescription pad, as structured data.
--
-- The doctor used to type diagnosis / prescription / advice into three free
-- text boxes. The pad now records each part as a list, the way it prints:
--
--   complaints      text[]  chief complaints, one per line
--   examinations    text[]  on-examination findings (starts from the vitals)
--   investigations  jsonb   [{ "name": "S. Creatinine", "result": "0.99" }]
--   advices         text[]  advice, one per line
--   medicines       jsonb   [{ "name": "Tab. Cetirizine 10 mg",
--                              "dose": ["0","0","1"],
--                              "meal": "after" | "before",
--                              "duration": { "unit": "continue" }
--                                        | { "unit": "days"|"weeks"|"months", "count": 7 } }]
--
-- NULL means "the doctor has not written this yet", which is different from
-- an empty list: the pad pre-fills examinations from the nurse's vitals and
-- complaints from reception's skin conditions only while the column is NULL,
-- so a doctor who deliberately clears a section does not see it refill.
--
-- diagnosis / prescription / advice / follow_up_date stay for older visits.
--
-- Safe to run twice.

alter table public.visits
  add column if not exists complaints     text[],
  add column if not exists examinations   text[],
  add column if not exists investigations jsonb,
  add column if not exists advices        text[],
  add column if not exists medicines      jsonb;

alter table public.visits
  drop constraint if exists visits_investigations_array_check;
alter table public.visits
  add constraint visits_investigations_array_check
  check (investigations is null or jsonb_typeof(investigations) = 'array');

alter table public.visits
  drop constraint if exists visits_medicines_array_check;
alter table public.visits
  add constraint visits_medicines_array_check
  check (medicines is null or jsonb_typeof(medicines) = 'array');
