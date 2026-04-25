-- 1. Ajouter "crypto" à l'enum payment_method (pour NOWPayments)
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'crypto';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'card';

-- 2. Nouvelles colonnes sur payment_requests
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_tx_ref text,
  ADD COLUMN IF NOT EXISTS provider_tx_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'XAF',
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_payment_requests_provider_tx_ref
  ON public.payment_requests(provider_tx_ref);

CREATE INDEX IF NOT EXISTS idx_payment_requests_status
  ON public.payment_requests(status);

-- 3. Fonction qui active l'abonnement automatiquement
CREATE OR REPLACE FUNCTION public.activate_subscription_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days int;
  _new_end timestamptz;
  _current_end timestamptz;
BEGIN
  -- Ne s'exécute que lors du passage à 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN

    -- Durée selon l'offre
    _days := CASE NEW.offer
      WHEN 'sub_1m'  THEN 30
      WHEN 'sub_3m'  THEN 90
      WHEN 'sub_6m'  THEN 180
      WHEN 'sub_12m' THEN 365
      WHEN 'formation' THEN NULL  -- Formation : accès illimité
      ELSE 30
    END;

    -- Récupère la fin d'abonnement actuelle (si encore valide, on prolonge)
    SELECT subscription_ends_at INTO _current_end
    FROM public.profiles WHERE id = NEW.user_id;

    IF _days IS NULL THEN
      -- Formation = pas de date d'expiration
      _new_end := NULL;
    ELSE
      _new_end := GREATEST(COALESCE(_current_end, now()), now()) + (_days || ' days')::interval;
    END IF;

    -- Met à jour le profil
    UPDATE public.profiles
       SET status = 'active',
           subscription_ends_at = CASE WHEN _days IS NULL THEN subscription_ends_at ELSE _new_end END,
           updated_at = now()
     WHERE id = NEW.user_id;

    -- Assigne le rôle (student pour formation, subscriber sinon)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.user_id,
      CASE WHEN NEW.offer = 'formation' THEN 'student'::app_role ELSE 'subscriber'::app_role END
    )
    ON CONFLICT DO NOTHING;

    -- Marque la date de paiement
    NEW.paid_at := COALESCE(NEW.paid_at, now());
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS trg_activate_subscription_on_approval ON public.payment_requests;
CREATE TRIGGER trg_activate_subscription_on_approval
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.activate_subscription_on_approval();