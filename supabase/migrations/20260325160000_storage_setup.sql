-- Storage Buckets Configuration for Supabase Local Development
-- This ensures that when someone runs `supabase start` from scratch, the required buckets are created.

-- Create the "pdf-sessions" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-sessions', 'pdf-sessions', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for pdf-sessions bucket
-- Read access: Users can only read their own files.
-- We check if the auth.uid() is somewhere in the folder path or we ensure RLS is used in our API routes.
-- Usually, VibePDF uses server-side service keys for storage access which bypasses RLS,
-- but adding basic policies is good practice.

CREATE POLICY "Authenticated users can read their own PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdf-sessions' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Authenticated users can upload their own PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdf-sessions' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Authenticated users can update their own PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pdf-sessions' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);

CREATE POLICY "Authenticated users can delete their own PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdf-sessions' AND (auth.uid())::text = (string_to_array(name, '/'))[1]);
