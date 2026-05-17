-- Add form_values column to sessions table to store the virtual state of the PDF form
-- This allows for non-destructive regeneration of the PDF from its original source
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS form_values JSONB DEFAULT '{}'::jsonb;

-- Add a comment for clarity
COMMENT ON COLUMN sessions.form_values IS 'Stores the current virtual state of the form fields to allow for non-destructive regeneration and state persistence.';
