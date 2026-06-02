CREATE OR REPLACE FUNCTION public.pay_with_affiliate_credit(_offer offer_type, _amount_fcfa int)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _bal int; _pid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF _amount_fcfa IS NULL OR _amount_fcfa <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;

  SELECT balance_fcfa INTO _bal FROM public.affiliates WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL OR _bal < _amount_fcfa THEN
    RAISE EXCEPTION 'Crédit insuffisant (solde: %, requis: %)', COALESCE(_bal,0), _amount_fcfa;
  END IF;

  UPDATE public.affiliates
     SET balance_fcfa = balance_fcfa - _amount_fcfa,
         total_paid_fcfa = total_paid_fcfa + _amount_fcfa
   WHERE user_id = _uid;

  INSERT INTO public.payment_requests (
    user_id, offer, amount_fcfa, method, status, provider, note, paid_at, reviewed_at
  ) VALUES (
    _uid, _offer, _amount_fcfa, 'momo', 'approved', 'affiliate_credit',
    'Payé avec le crédit affilié interne', now(), now()
  )
  RETURNING id INTO _pid;

  RETURN _pid;
END;$$;

REVOKE ALL ON FUNCTION public.pay_with_affiliate_credit(offer_type, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_with_affiliate_credit(offer_type, int) TO authenticated;