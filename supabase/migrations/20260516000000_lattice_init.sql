-- Update sessions table for Lattice
ALTER TABLE sessions 
DROP COLUMN IF EXISTS num_pages,
DROP COLUMN IF EXISTS original_filename,
DROP COLUMN IF EXISTS file_size,
DROP COLUMN IF EXISTS pdf_version,
DROP COLUMN IF EXISTS pdf_analysis,
DROP COLUMN IF EXISTS form_values;

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'New Design',
ADD COLUMN IF NOT EXISTS conversation_log TEXT;

-- Drop obsolete tables
DROP TABLE IF EXISTS pdf_versions;
DROP TABLE IF EXISTS signatures;

-- Update the storage bucket name or ensure it exists via config if possible, 
-- but SQL usually doesn't manage storage buckets directly in Supabase without extensions.
-- We'll rely on the application code or manual setup for the "lattice-artifacts" bucket.
