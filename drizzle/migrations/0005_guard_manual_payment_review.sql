CREATE OR REPLACE FUNCTION public.guard_manual_payment_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE expected_amount integer;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.provider = 'manual' AND OLD.status <> 'pending' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Ce transfert a déjà été examiné.';
  END IF;
  IF NEW.provider = 'manual' THEN
    expected_amount := CASE NEW.offer WHEN 'sub_1m' THEN 2500 WHEN 'sub_3m' THEN 7500 WHEN 'sub_6m' THEN 15000 WHEN 'sub_12m' THEN 30000 ELSE NULL END;
    IF expected_amount IS NULL OR NEW.amount_fcfa IS DISTINCT FROM expected_amount OR NEW.amount IS DISTINCT FROM expected_amount OR NEW.currency IS DISTINCT FROM 'XAF' THEN
      RAISE EXCEPTION 'Offre ou montant du transfert invalide.';
    END IF;
    IF NEW.method::text NOT IN ('mtn','orange') OR NEW.payer_phone IS NULL OR NEW.payer_phone !~ '^6[0-9]{8}$' OR length(trim(COALESCE(NEW.provider_tx_id,''))) < 4 THEN
      RAISE EXCEPTION 'Numéro ou référence du transfert invalide.';
    END IF;
    IF TG_OP = 'INSERT' AND (NEW.status <> 'pending' OR NEW.paid_at IS NOT NULL OR NEW.reviewed_at IS NOT NULL OR NEW.reviewed_by IS NOT NULL) THEN
      RAISE EXCEPTION 'Un transfert doit être déclaré en attente de validation.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Validation réservée à l’administrateur.';
      END IF;
      NEW.reviewed_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER a_guard_manual_payment_review BEFORE INSERT OR UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.guard_manual_payment_review();