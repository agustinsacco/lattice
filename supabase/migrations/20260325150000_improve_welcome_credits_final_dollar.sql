-- Update the grant_welcome_credits function to use the corrected 10,000 credits ($1.00 value)
CREATE OR REPLACE FUNCTION "public"."grant_welcome_credits"("user_id_arg" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_balance NUMERIC;
  already_granted BOOLEAN;
  welcome_amount NUMERIC := 10000.0; -- Exactly $1.00 of free credits based on 10,000x multiplier
BEGIN
  -- 1. Single atomic check and lock
  SELECT has_received_welcome_credits, balance 
  INTO already_granted, current_balance
  FROM user_credits
  WHERE user_id = user_id_arg
  FOR UPDATE;

  -- 2. If already granted, avoid any further action
  IF already_granted IS TRUE THEN
    RETURN FALSE;
  END IF;

  -- 3. If the user_credits row doesn't exist yet (brand new registration edge case)
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance, has_received_welcome_credits)
    VALUES (user_id_arg, welcome_amount, TRUE)
    ON CONFLICT (user_id) DO UPDATE SET 
      balance = user_credits.balance + welcome_amount,
      has_received_welcome_credits = TRUE;
      
    INSERT INTO credit_transactions (
      user_id, 
      amount, 
      transaction_type, 
      description
    ) VALUES (
      user_id_arg, 
      welcome_amount, 
      'welcome_bonus', 
      'Welcome bonus - Your first $1 of credits on us!'
    );
    RETURN TRUE;
  END IF;

  -- 4. Standard Case: Row exists with flag as false
  UPDATE user_credits
  SET 
    balance = balance + welcome_amount,
    has_received_welcome_credits = TRUE,
    updated_at = NOW()
  WHERE user_id = user_id_arg;

  INSERT INTO credit_transactions (
    user_id, 
    amount, 
    transaction_type, 
    description
  ) VALUES (
    user_id_arg, 
    welcome_amount, 
    'welcome_bonus', 
    'Welcome bonus - Your first $1 of credits on us!'
  );

  RETURN TRUE;
END;
$$;
