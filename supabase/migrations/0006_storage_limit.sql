-- Raise the software bucket's per-file size limit to 700 MB (700 * 1024 * 1024).
-- NOTE: the project's GLOBAL upload limit (Dashboard → Storage → Settings) must
-- also be >= this, and large limits may require a paid Supabase plan.
update storage.buckets
set file_size_limit = 734003200
where id = 'software';
