CREATE OR REPLACE FUNCTION public.activate_subscription_on_approval()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _days int; _new_end timestamptz; _current_end timestamptz; _aff uuid;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    _days := CASE NEW.offer WHEN 'sub_1m' THEN 30 WHEN 'sub_3m' THEN 90 WHEN 'sub_6m' THEN 180 WHEN 'sub_12m' THEN 365 ELSE 30 END;
    SELECT subscription_ends_at INTO _current_end FROM public.profiles WHERE id = NEW.user_id;
    _new_end := GREATEST(COALESCE(_current_end, now()), now()) + (_days || ' days')::interval;
    UPDATE public.profiles SET status='active', subscription_ends_at=_new_end, updated_at=now() WHERE id = NEW.user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'subscriber'::app_role) ON CONFLICT DO NOTHING;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
    SELECT affiliate_user_id INTO _aff FROM public.affiliate_referrals WHERE referred_user_id = NEW.user_id;
    IF _aff IS NOT NULL THEN
      INSERT INTO public.affiliate_commissions (affiliate_user_id, referred_user_id, payment_request_id, amount_fcfa, status)
      VALUES (_aff, NEW.user_id, NEW.id, 500, 'approved') ON CONFLICT (payment_request_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'subscriber'::app_role FROM public.user_roles WHERE role = 'student'
ON CONFLICT DO NOTHING;
DELETE FROM public.user_roles WHERE role = 'student';