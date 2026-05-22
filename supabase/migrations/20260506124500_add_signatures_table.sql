-- Migration to add signatures table
CREATE TABLE IF NOT EXISTS public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT 'My Signature',
  image_data TEXT NOT NULL, -- Base64 encoded PNG
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own signatures"
  ON public.signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own signatures"
  ON public.signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures"
  ON public.signatures FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signatures"
  ON public.signatures FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access to authenticated users (but restricted by RLS)
GRANT ALL ON public.signatures TO authenticated;
GRANT ALL ON public.signatures TO service_role;
