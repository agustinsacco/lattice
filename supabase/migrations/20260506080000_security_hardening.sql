-- Security Hardening Migration
-- 1. Revoke default public execute privileges on all functions
-- 2. Restrict sensitive credit and session functions to service_role only
-- 3. Update SECURITY DEFINER functions to use a secure search_path

-- 1. Update Default Privileges
-- This ensures that any new functions created in the future are not automatically accessible to anon or authenticated roles.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 2. Revoke Execute on Existing Sensitive Functions
-- Revoking from 'public' also revokes from 'anon' and 'authenticated' unless explicitly granted elsewhere.
-- Note: We specify the full argument types to disambiguate overloads.
REVOKE EXECUTE ON FUNCTION public.increment_user_credits(uuid, double precision, text, text, uuid, uuid, text, double precision, double precision, integer, integer) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_user_credits_v2(uuid, double precision, text, text, uuid, uuid, text, double precision, double precision, integer, integer, boolean) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_session_cost(uuid, numeric) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_session_cost(uuid, numeric, numeric) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- 3. Explicitly Grant to Internal Roles
GRANT EXECUTE ON FUNCTION public.increment_user_credits(uuid, double precision, text, text, uuid, uuid, text, double precision, double precision, integer, integer) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.increment_user_credits_v2(uuid, double precision, text, text, uuid, uuid, text, double precision, double precision, integer, integer, boolean) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.increment_session_cost(uuid, numeric) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.increment_session_cost(uuid, numeric, numeric) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, postgres;

-- 4. Harden SECURITY DEFINER functions with search_path
-- This prevents search_path hijacking vulnerabilities.
ALTER FUNCTION public.increment_user_credits(uuid, double precision, text, text, uuid, uuid, text, double precision, double precision, integer, integer) SET search_path = public;
ALTER FUNCTION public.increment_user_credits_v2(uuid, double precision, text, text, uuid, uuid, text, double precision, double precision, integer, integer, boolean) SET search_path = public;
ALTER FUNCTION public.increment_session_cost(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.increment_session_cost(uuid, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.grant_welcome_credits(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth;
