-- Add pdf_analysis column to sessions table to store structured PDF structure for the agent
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pdf_analysis JSONB DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN sessions.pdf_analysis IS 'Stores the structured analysis of the PDF fields for agent system context injection.';
