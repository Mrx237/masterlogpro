
-- ============ AFFILIATE SYSTEM ============

CREATE TYPE public.commission_status AS ENUM ('pending','approved','paid','cancelled');
CREATE TYPE public.payout_method AS ENUM ('momo','credit');
CREATE TYPE public.payout_status AS ENUM ('requested','paid','rejected');

-- Code generator (8 chars uppercase alphanumeric)
CREATE OR REPLACE FUNCTION public.gen_affiliate_code()
RETURNS text LANGUAGE plpgsql SET search_path=public AS $$
DECLARE c text; chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  LOOP
    c := '';
    FOR i IN 1..8 LOOP c := c || substr(chars, 1 + floor(random()*length(chars))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE code = c);
  END LOOP;
  RETURN c;
END;$$;

-- Affiliates: one row per user with their referral code + balance
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  balance_fcfa integer NOT NULL DEFAULT 0,
  total_earned_fcfa integer NOT NULL DEFAULT 0,
  total_paid_fcfa integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliates TO authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own affiliate" ON public.affiliates FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "Users create own affiliate" ON public.affiliates FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Admins manage affiliates" ON public.affiliates FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Referrals: link affiliate <-> referred user (unique per referred user)
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate views own referrals" ON public.affiliate_referrals FOR SELECT USING (auth.uid()=affiliate_user_id);
CREATE POLICY "Admins view all referrals" ON public.affiliate_referrals FOR SELECT USING (is_admin(auth.uid()));

-- Commissions: one per approved payment, 20% of amount
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  payment_request_id uuid NOT NULL UNIQUE,
  amount_fcfa integer NOT NULL,
  status commission_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate views own commissions" ON public.affiliate_commissions FOR SELECT USING (auth.uid()=affiliate_user_id);
CREATE POLICY "Admins view all commissions" ON public.affiliate_commissions FOR SELECT USING (is_admin(auth.uid()));

-- Payouts: withdrawal requests (momo or credit)
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL,
  amount_fcfa integer NOT NULL CHECK (amount_fcfa > 0),
  method payout_method NOT NULL,
  phone text,
  status payout_status NOT NULL DEFAULT 'requested',
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate views own payouts" ON public.affiliate_payouts FOR SELECT USING (auth.uid()=affiliate_user_id);
CREATE POLICY "Affiliate creates own payouts" ON public.affiliate_payouts FOR INSERT WITH CHECK (auth.uid()=affiliate_user_id);
CREATE POLICY "Admins manage payouts" ON public.affiliate_payouts FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Trigger: on commission insert -> update affiliate balance
CREATE OR REPLACE FUNCTION public.on_commission_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.status='approved' THEN
    UPDATE public.affiliates
      SET balance_fcfa = balance_fcfa + NEW.amount_fcfa,
          total_earned_fcfa = total_earned_fcfa + NEW.amount_fcfa
      WHERE user_id = NEW.affiliate_user_id;
  END IF;
  RETURN NEW;
END;$$;

CREATE TRIGGER trg_commission_change
AFTER INSERT ON public.affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION public.on_commission_change();

-- Trigger: on payout request -> debit balance; on paid -> total_paid; on rejected -> refund
CREATE OR REPLACE FUNCTION public.on_payout_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _bal int;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.amount_fcfa < 5000 THEN RAISE EXCEPTION 'Le retrait minimum est de 5000 FCFA'; END IF;
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
END;$$;

CREATE TRIGGER trg_payout_change
BEFORE INSERT OR UPDATE ON public.affiliate_payouts
FOR EACH ROW EXECUTE FUNCTION public.on_payout_change();

-- Update handle_new_user: auto-create affiliate code + record referral if ?ref=CODE present
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _ref_code text; _aff_user uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), 'pending');

  -- Auto-create affiliate code
  INSERT INTO public.affiliates (user_id, code)
  VALUES (NEW.id, public.gen_affiliate_code())
  ON CONFLICT (user_id) DO NOTHING;

  -- Attribute referral if metadata contains a code
  _ref_code := NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), '');
  IF _ref_code IS NOT NULL THEN
    SELECT user_id INTO _aff_user FROM public.affiliates WHERE code = upper(_ref_code);
    IF _aff_user IS NOT NULL AND _aff_user <> NEW.id THEN
      INSERT INTO public.affiliate_referrals (affiliate_user_id, referred_user_id)
      VALUES (_aff_user, NEW.id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;$$;

-- Update activate_subscription_on_approval to also generate commission
CREATE OR REPLACE FUNCTION public.activate_subscription_on_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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

    -- Affiliate commission (20%)
    SELECT affiliate_user_id INTO _aff FROM public.affiliate_referrals WHERE referred_user_id = NEW.user_id;
    IF _aff IS NOT NULL THEN
      _commission := floor(COALESCE(NEW.amount_fcfa,0) * 0.20)::int;
      IF _commission > 0 THEN
        INSERT INTO public.affiliate_commissions (affiliate_user_id, referred_user_id, payment_request_id, amount_fcfa, status)
        VALUES (_aff, NEW.user_id, NEW.id, _commission, 'approved')
        ON CONFLICT (payment_request_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_activate_subscription_on_approval ON public.payment_requests;
CREATE TRIGGER trg_activate_subscription_on_approval
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.activate_subscription_on_approval();

-- Backfill: create affiliate codes for existing users
INSERT INTO public.affiliates (user_id, code)
SELECT p.id, public.gen_affiliate_code()
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.affiliates a WHERE a.user_id = p.id);
