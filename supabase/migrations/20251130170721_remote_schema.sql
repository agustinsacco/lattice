


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."grant_welcome_credits"("user_id_arg" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_balance NUMERIC;
  already_granted BOOLEAN;
BEGIN
  -- 1. Lock the user_credits row for this transaction to prevent race conditions
  -- We use FOR UPDATE to ensure no other transaction can modify this row until we're done
  SELECT has_received_welcome_credits, balance 
  INTO already_granted, current_balance
  FROM user_credits
  WHERE user_id = user_id_arg
  FOR UPDATE;

  -- If the row doesn't exist, we can't grant credits (user should be created first)
  IF NOT FOUND THEN
    -- Try to insert the row if it doesn't exist (handling the edge case of brand new user)
    INSERT INTO user_credits (user_id, balance, has_received_welcome_credits)
    VALUES (user_id_arg, 3, TRUE)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- If we successfully inserted, log the transaction and return true
    IF FOUND THEN
      INSERT INTO credit_transactions (
        user_id, 
        amount, 
        transaction_type, 
        description
      ) VALUES (
        user_id_arg, 
        3, 
        'welcome_bonus', 
        'Welcome bonus - Thank you for joining VibePDF!'
      );
      RETURN TRUE;
    END IF;

    -- If insert failed (conflict), it means row exists now, so loop back or just fail safe
    -- For simplicity/safety, we'll return false and let the client retry if needed
    RETURN FALSE;
  END IF;

  -- 2. If already granted, return false immediately
  IF already_granted THEN
    RETURN FALSE;
  END IF;

  -- 3. Grant credits and set flag in a single update
  UPDATE user_credits
  SET 
    balance = balance + 3,
    has_received_welcome_credits = TRUE,
    updated_at = NOW()
  WHERE user_id = user_id_arg;

  -- 4. Log the transaction
  INSERT INTO credit_transactions (
    user_id, 
    amount, 
    transaction_type, 
    description
  ) VALUES (
    user_id_arg, 
    3, 
    'welcome_bonus', 
    'Welcome bonus - Thank you for joining VibePDF!'
  );

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."grant_welcome_credits"("user_id_arg" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (new.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_session_cost"("session_id_arg" "uuid", "cost_increment" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.sessions
  SET cost = cost + cost_increment
  WHERE id = session_id_arg;
END;
$$;


ALTER FUNCTION "public"."increment_session_cost"("session_id_arg" "uuid", "cost_increment" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_credits"("user_id_arg" "uuid", "amount_arg" double precision, "transaction_type_arg" "text", "description_arg" "text" DEFAULT NULL::"text", "session_id_arg" "uuid" DEFAULT NULL::"uuid", "message_id_arg" "uuid" DEFAULT NULL::"uuid", "model_arg" "text" DEFAULT NULL::"text", "base_cost_arg" double precision DEFAULT NULL::double precision, "margin_arg" double precision DEFAULT NULL::double precision, "input_tokens_arg" integer DEFAULT NULL::integer, "output_tokens_arg" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update user balance
    UPDATE public.user_credits
    SET 
        balance = balance + amount_arg,
        updated_at = NOW()
    WHERE user_id = user_id_arg;

    -- Record transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        transaction_type,
        description,
        session_id,
        message_id,
        model,
        base_cost,
        margin,
        input_tokens,
        output_tokens
    ) VALUES (
        user_id_arg,
        amount_arg,
        transaction_type_arg,
        description_arg,
        session_id_arg,
        message_id_arg,
        model_arg,
        base_cost_arg,
        margin_arg,
        input_tokens_arg,
        output_tokens_arg
    );
END;
$$;


ALTER FUNCTION "public"."increment_user_credits"("user_id_arg" "uuid", "amount_arg" double precision, "transaction_type_arg" "text", "description_arg" "text", "session_id_arg" "uuid", "message_id_arg" "uuid", "model_arg" "text", "base_cost_arg" double precision, "margin_arg" double precision, "input_tokens_arg" integer, "output_tokens_arg" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."credit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "transaction_type" "text" NOT NULL,
    "description" "text",
    "session_id" "uuid",
    "message_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "model" "text",
    "base_cost" numeric,
    "margin" numeric,
    "input_tokens" integer,
    "output_tokens" integer
);


ALTER TABLE "public"."credit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "type" "text",
    "tool_name" "text",
    "tool_input" "jsonb",
    "tool_output" "jsonb",
    "token_usage" "jsonb",
    "attachments" "jsonb"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pdf_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pdf_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    "num_pages" integer,
    "original_filename" "text",
    "file_size" bigint,
    "pdf_version" integer,
    "user_id" "uuid",
    "cost_usd" numeric(10,6) DEFAULT 0 NOT NULL,
    "credits_used" numeric(10,4) DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sessions"."pdf_version" IS '.';



CREATE TABLE IF NOT EXISTS "public"."user_credits" (
    "user_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "daily_credits_last_reset" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "has_received_welcome_credits" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."user_credits" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_credits"."has_received_welcome_credits" IS 'Tracks whether the user has received their one-time welcome credits bonus. Set to TRUE after granting 3 welcome credits.';



CREATE TABLE IF NOT EXISTS "public"."user_memory" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "key" character varying(255) NOT NULL,
    "value" "text" NOT NULL,
    "category" character varying(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_memory" OWNER TO "postgres";


ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pdf_versions"
    ADD CONSTRAINT "pdf_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pdf_versions"
    ADD CONSTRAINT "unique_session_version" UNIQUE ("session_id", "version_number");



ALTER TABLE ONLY "public"."user_memory"
    ADD CONSTRAINT "unique_user_key" UNIQUE ("user_id", "key");



ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_memory"
    ADD CONSTRAINT "user_memory_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_credit_transactions_created_at" ON "public"."credit_transactions" USING "btree" ("created_at");



CREATE INDEX "idx_credit_transactions_user_id" ON "public"."credit_transactions" USING "btree" ("user_id");



CREATE INDEX "idx_messages_session_id" ON "public"."messages" USING "btree" ("session_id");



CREATE INDEX "idx_pdf_versions_session_id" ON "public"."pdf_versions" USING "btree" ("session_id");



CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_user_credits_welcome_flag" ON "public"."user_credits" USING "btree" ("has_received_welcome_credits");



CREATE INDEX "idx_user_memory_category" ON "public"."user_memory" USING "btree" ("category");



CREATE INDEX "idx_user_memory_user_id" ON "public"."user_memory" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credit_transactions"
    ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_memory"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pdf_versions"
    ADD CONSTRAINT "pdf_versions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credits"
    ADD CONSTRAINT "user_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create messages in their sessions" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create their own sessions" ON "public"."sessions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete messages in their sessions" ON "public"."messages" FOR DELETE TO "authenticated" USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete own memory" ON "public"."user_memory" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sessions" ON "public"."sessions" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own memory" ON "public"."user_memory" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert versions for their own sessions" ON "public"."pdf_versions" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "sessions"."user_id"
   FROM "public"."sessions"
  WHERE ("sessions"."id" = "pdf_versions"."session_id"))));



CREATE POLICY "Users can update messages in their sessions" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own memory" ON "public"."user_memory" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own sessions" ON "public"."sessions" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can upsert own memory" ON "public"."user_memory" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view messages from their sessions" ON "public"."messages" FOR SELECT TO "authenticated" USING (("session_id" IN ( SELECT "sessions"."id"
   FROM "public"."sessions"
  WHERE ("sessions"."user_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view own memory" ON "public"."user_memory" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own credit balance" ON "public"."user_credits" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own credit transactions" ON "public"."credit_transactions" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own session versions" ON "public"."pdf_versions" FOR SELECT USING (("auth"."uid"() = ( SELECT "sessions"."user_id"
   FROM "public"."sessions"
  WHERE ("sessions"."id" = "pdf_versions"."session_id"))));



CREATE POLICY "Users can view their own sessions" ON "public"."sessions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."credit_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pdf_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_credits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_memory" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."grant_welcome_credits"("user_id_arg" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_welcome_credits"("user_id_arg" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_welcome_credits"("user_id_arg" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_session_cost"("session_id_arg" "uuid", "cost_increment" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_session_cost"("session_id_arg" "uuid", "cost_increment" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_session_cost"("session_id_arg" "uuid", "cost_increment" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_credits"("user_id_arg" "uuid", "amount_arg" double precision, "transaction_type_arg" "text", "description_arg" "text", "session_id_arg" "uuid", "message_id_arg" "uuid", "model_arg" "text", "base_cost_arg" double precision, "margin_arg" double precision, "input_tokens_arg" integer, "output_tokens_arg" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_credits"("user_id_arg" "uuid", "amount_arg" double precision, "transaction_type_arg" "text", "description_arg" "text", "session_id_arg" "uuid", "message_id_arg" "uuid", "model_arg" "text", "base_cost_arg" double precision, "margin_arg" double precision, "input_tokens_arg" integer, "output_tokens_arg" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_credits"("user_id_arg" "uuid", "amount_arg" double precision, "transaction_type_arg" "text", "description_arg" "text", "session_id_arg" "uuid", "message_id_arg" "uuid", "model_arg" "text", "base_cost_arg" double precision, "margin_arg" double precision, "input_tokens_arg" integer, "output_tokens_arg" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."credit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."credit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."credit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."pdf_versions" TO "anon";
GRANT ALL ON TABLE "public"."pdf_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."pdf_versions" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_credits" TO "anon";
GRANT ALL ON TABLE "public"."user_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."user_credits" TO "service_role";



GRANT ALL ON TABLE "public"."user_memory" TO "anon";
GRANT ALL ON TABLE "public"."user_memory" TO "authenticated";
GRANT ALL ON TABLE "public"."user_memory" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































