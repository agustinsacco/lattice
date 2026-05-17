-- Fix increment_session_cost to use correct column names and add credits_used increment
-- Also added check to prevent negative balance after deduction in increment_user_credits

CREATE OR REPLACE FUNCTION public.increment_session_cost(
  session_id_arg uuid, 
  cost_increment numeric,
  credits_increment numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sessions
  SET 
    cost_usd = cost_usd + cost_increment,
    credits_used = credits_used + credits_increment,
    updated_at = NOW()
  WHERE id = session_id_arg;
END;
$$;

-- Enhanced version of increment_user_credits that can enforce atomic balance checks
CREATE OR REPLACE FUNCTION public.increment_user_credits_v2(
  user_id_arg uuid, 
  amount_arg double precision, 
  transaction_type_arg text, 
  description_arg text DEFAULT NULL, 
  session_id_arg uuid DEFAULT NULL, 
  message_id_arg uuid DEFAULT NULL, 
  model_arg text DEFAULT NULL, 
  base_cost_arg double precision DEFAULT NULL, 
  margin_arg double precision DEFAULT NULL, 
  input_tokens_arg integer DEFAULT NULL, 
  output_tokens_arg integer DEFAULT NULL,
  enforce_balance boolean DEFAULT true
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
    -- 1. Lock the row for this user to prevent races
    SELECT balance INTO current_balance
    FROM public.user_credits
    WHERE user_id = user_id_arg
    FOR UPDATE;

    -- 2. If it's a deduction and we're enforcing balance, check if they have enough
    IF amount_arg < 0 AND enforce_balance AND (current_balance + amount_arg) < 0 THEN
        RETURN FALSE;
    END IF;

    -- 3. Update user balance
    UPDATE public.user_credits
    SET 
        balance = balance + amount_arg,
        updated_at = NOW()
    WHERE user_id = user_id_arg;

    -- 4. Record transaction
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

    RETURN TRUE;
END;
$$;
