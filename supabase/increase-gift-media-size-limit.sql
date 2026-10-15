-- Run this in Supabase Dashboard → SQL Editor only if your Supabase plan
-- supports a 500 MB maximum object size. Plan-level limits cannot be bypassed
-- with SQL. If 500 MB is above your plan's maximum, use the largest supported
-- value instead (bytes = MB * 1024 * 1024).
--
-- This changes only the existing private gift-media bucket's per-file limit.
-- It does not make the bucket public and does not change access policies.

UPDATE storage.buckets
SET file_size_limit = 524288000
WHERE id = 'gift-media';

-- Confirm the resulting bucket configuration:
SELECT id, public, file_size_limit
FROM storage.buckets
WHERE id = 'gift-media';
