-- The three before/after sliders the landing page always had, as rows in
-- site_results, so the "Transformative Results" section shows from day one
-- and the owner can replace them from Website → Results.
--
-- They are placeholders: both sides point at the same picture, and the site
-- tints the "before" side whenever the two are identical, exactly as the
-- hard-coded version did. Real pairs uploaded from the dashboard are shown
-- as they are.
--
-- Only seeds an empty table, so it is safe to run twice and never undoes the
-- owner's edits.

insert into public.site_results (title, before_image_path, after_image_path, sort_order)
select v.title, v.image, v.image, v.sort_order
  from (values
    ('Body Contouring',   '/media/mirror.jpg', 1),
    ('Injectable Filler', '/media/serum.jpg',  2),
    ('Vein Treatment',    '/media/facial.jpg', 3)
  ) as v(title, image, sort_order)
 where not exists (select 1 from public.site_results);
