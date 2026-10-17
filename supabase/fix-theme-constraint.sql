-- ============================================================================================
-- Fix the stale gifts_theme_check constraint
-- ============================================================================================
-- Symptom this repairs:
--
--   new row for relation "gifts" violates check constraint "gifts_theme_check" - code 23514
--
-- which surfaced in the studio as "Save failed. Please try again before publishing." and
-- "Could not save your reveal settings." — three different complaints with one cause.
--
-- Why it happens: the constraint was written when the studio offered three themes. The theme
-- registry now offers ten, so `rosewater`, `cherry-blossom` and the rest are all values the
-- database refuses. Worse, the studio normalizes a stored theme on load (`rose` becomes
-- `rosewater`), so merely *opening* an existing gift and pressing Save submits a value the
-- constraint rejects. That is why the failure hit theme edits, letter edits and reveal
-- settings alike: every save writes the theme.
--
-- What this does: drops the stale constraint and re-adds it with every value the application
-- can now produce. The constraint is kept — it is not removed and arbitrary values are still
-- rejected. No column is added or dropped, no row is rewritten, and no ordering is changed.
--
-- Verified against production before writing this: the table holds two rows, with themes
-- `rose` and `midnight`. Both are in the list below, so the ADD CONSTRAINT validates cleanly.
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- Safe to run more than once.
-- ============================================================================================

-- --------------------------------------------------------------------------------------------
-- 1. Show what is being replaced, and what the table currently holds.
--    Purely informational — it changes nothing. If this query returns rows, the ADD CONSTRAINT
--    below would fail, and the fix is to add those values to the list in section 2 instead of
--    dropping this check.
-- --------------------------------------------------------------------------------------------

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.gifts'::regclass and conname = 'gifts_theme_check';

select theme, count(*) as rows
from public.gifts
group by theme
order by theme;

-- --------------------------------------------------------------------------------------------
-- 2. Replace the constraint.
-- --------------------------------------------------------------------------------------------

alter table public.gifts drop constraint if exists gifts_theme_check;

alter table public.gifts
  add constraint gifts_theme_check check (
    -- NULL is allowed: the column always had a default and the studio always writes a theme,
    -- but a CHECK passes on NULL anyway and this documents that it is not an error.
    theme is null
    -- The three values the original studio wrote. Still permitted, because gifts published
    -- under that picker still carry them and the recipient page still resolves each one to
    -- the theme its creator chose (rose -> Rosewater, midnight -> Midnight Elegance,
    -- ivory -> Champagne Glow).
    or theme in ('rose', 'midnight', 'ivory')
    -- The ten themes the registry offers today.
    or theme in (
      'rosewater',
      'cherry-blossom',
      'romantic-sunset',
      'lavender-dream',
      'midnight-elegance',
      'champagne-glow',
      'sage-pearl',
      'ocean-serenity',
      'dreamy-pastels',
      'custom'
    )
    -- A custom theme is stored as `custom:` followed by its five creator-chosen colours, so it
    -- is matched as a shape rather than listed. The pattern accepts #rgb and #rrggbb, which is
    -- exactly the range the editor's colour inputs can produce — anything else is still
    -- rejected, and `encodeThemeValue` already refuses to write a value it cannot read back.
    or theme ~ '^custom:(#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?,){4}#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$'
  );

-- --------------------------------------------------------------------------------------------
-- 3. Confirm. Expect exactly one row, describing the check added above.
-- --------------------------------------------------------------------------------------------

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.gifts'::regclass and conname = 'gifts_theme_check';
