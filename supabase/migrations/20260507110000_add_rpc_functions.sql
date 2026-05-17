-- Create increment_session_cost_v2 function
CREATE OR REPLACE FUNCTION public.increment_session_cost_v2(
    session_id_arg uuid,
    cost_increment numeric,
    credits_increment numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE sessions
    SET 
        cost_usd = COALESCE(cost_usd, 0) + cost_increment,
        credits_used = COALESCE(credits_used, 0) + credits_increment,
        updated_at = now()
    WHERE id = session_id_arg;
END;
$$;

-- Create increment_user_credits function if missing
CREATE OR REPLACE FUNCTION public.increment_user_credits(
    user_id_arg uuid,
    amount_increment numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_credits (user_id, balance, updated_at)
    VALUES (user_id_arg, amount_increment, now())
    ON CONFLICT (user_id)
    DO UPDATE SET 
        balance = user_credits.balance + amount_increment,
        updated_at = now();
END;
$$;
