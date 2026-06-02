CREATE OR REPLACE FUNCTION public.activate_subscription_on_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _days int; _new_end timestamptz; _current_end timestamptz;
  _aff uuid; _commission int;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN

    _days := CASE NEW.offer
      WHEN 'sub_1m' THEN 30 WHEN 'sub_3m' THEN 90 WHEN 'sub_6m' THEN 180
      WHEN 'sub_12m' THEN 365 WHEN 'formation' THEN NULL ELSE 30 END;

    SELECT subscription_ends_at INTO _current_end FROM public.profiles WHERE id = NEW.user_id;

    IF _days IS NULL THEN _new_end := NULL;
    ELSE _new_end := GREATEST(COALESCE(_current_end, now()), now()) + (_days || ' days')::interval;
    END IF;

    UPDATE public.profiles
       SET status='active',
           subscription_ends_at = CASE WHEN _days IS NULL THEN subscription_ends_at ELSE _new_end END,
           updated_at=now()
     WHERE id = NEW.user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, CASE WHEN NEW.offer='formation' THEN 'student'::app_role ELSE 'subscriber'::app_role END)
    ON CONFLICT DO NOTHING;

    NEW.paid_at := COALESCE(NEW.paid_at, now());
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());

    -- Affiliate commission: fixed 1000 FCFA per validated payment
    SELECT affiliate_user_id INTO _aff FROM public.affiliate_referrals WHERE referred_user_id = NEW.user_id;
    IF _aff IS NOT NULL THEN
      _commission := 1000;
      INSERT INTO public.affiliate_commissions (affiliate_user_id, referred_user_id, payment_request_id, amount_fcfa, status)
      VALUES (_aff, NEW.user_id, NEW.id, _commission, 'approved')
      ON CONFLICT (payment_request_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;$function$;

CREATE OR REPLACE FUNCTION public.on_payout_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _bal int;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.amount_fcfa < 1000 THEN RAISE EXCEPTION 'Le retrait minimum est de 1000 FCFA'; END IF;
    SELECT balance_fcfa INTO _bal FROM public.affiliates WHERE user_id = NEW.affiliate_user_id FOR UPDATE;
    IF _bal IS NULL OR _bal < NEW.amount_fcfa THEN RAISE EXCEPTION 'Solde insuffisant'; END IF;
    UPDATE public.affiliates SET balance_fcfa = balance_fcfa - NEW.amount_fcfa
      WHERE user_id = NEW.affiliate_user_id;
  ELSIF TG_OP='UPDATE' THEN
    IF OLD.status <> 'paid' AND NEW.status = 'paid' THEN
      UPDATE public.affiliates SET total_paid_fcfa = total_paid_fcfa + NEW.amount_fcfa
        WHERE user_id = NEW.affiliate_user_id;
      NEW.processed_at := COALESCE(NEW.processed_at, now());
    ELSIF OLD.status <> 'rejected' AND NEW.status = 'rejected' THEN
      UPDATE public.affiliates SET balance_fcfa = balance_fcfa + NEW.amount_fcfa
        WHERE user_id = NEW.affiliate_user_id;
      NEW.processed_at := COALESCE(NEW.processed_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;$function$;