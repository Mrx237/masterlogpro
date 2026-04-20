-- ============= ENUMS =============
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'subscriber');
CREATE TYPE public.account_status AS ENUM ('pending', 'active', 'expired');
CREATE TYPE public.trade_direction AS ENUM ('buy', 'sell');
CREATE TYPE public.trade_status AS ENUM ('win', 'loss', 'breakeven');
CREATE TYPE public.news_impact AS ENUM ('high', 'medium', 'low', 'none');
CREATE TYPE public.sentiment AS ENUM ('bullish', 'bearish', 'neutral');
CREATE TYPE public.error_tag AS ENUM ('bad_timing', 'overtrading', 'bad_analysis', 'none');
CREATE TYPE public.payment_method AS ENUM ('mtn', 'orange', 'airtel');
CREATE TYPE public.offer_type AS ENUM ('formation', 'sub_1m', 'sub_3m', 'sub_6m', 'sub_12m');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');

-- ============= UTIL: updated_at =============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============= PROFILES =============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  status public.account_status NOT NULL DEFAULT 'pending',
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= USER_ROLES =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

-- ============= TRADES =============
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pair TEXT NOT NULL,
  direction public.trade_direction NOT NULL,
  entry_price NUMERIC,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  lot_size NUMERIC,
  result_usd NUMERIC,
  status public.trade_status,
  screenshot_path TEXT,
  technical_comment TEXT,
  -- fundamental
  news_event TEXT,
  news_impact public.news_impact DEFAULT 'none',
  sentiment public.sentiment DEFAULT 'neutral',
  fundamental_note TEXT,
  source_link TEXT,
  -- analysis
  error_tag public.error_tag DEFAULT 'none',
  coach_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_trades_user ON public.trades(user_id);
CREATE INDEX idx_trades_date ON public.trades(trade_at DESC);
CREATE TRIGGER trg_trades_updated BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= PAYMENT REQUESTS =============
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer public.offer_type NOT NULL,
  amount_fcfa INTEGER NOT NULL,
  method public.payment_method NOT NULL,
  proof_path TEXT,
  payer_phone TEXT,
  note TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pr_user ON public.payment_requests(user_id);
CREATE INDEX idx_pr_status ON public.payment_requests(status);
CREATE TRIGGER trg_pr_updated BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= POLICIES: profiles =============
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- ============= POLICIES: user_roles =============
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============= POLICIES: trades =============
CREATE POLICY "Users CRUD own trades select" ON public.trades
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON public.trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON public.trades
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own trades" ON public.trades
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all trades" ON public.trades
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update trades feedback" ON public.trades
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- ============= POLICIES: payment_requests =============
CREATE POLICY "Users view own payments" ON public.payment_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own payments" ON public.payment_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all payments" ON public.payment_requests
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update payments" ON public.payment_requests
  FOR UPDATE USING (public.is_admin(auth.uid()));

-- ============= TRIGGER: auto profile on signup =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'pending');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= STORAGE BUCKETS =============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('trade-screenshots', 'trade-screenshots', false),
  ('payment-proofs', 'payment-proofs', false);

-- Storage policies: users access only their own folder (named by user id)
CREATE POLICY "Users read own trade screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own trade screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own trade screenshots" ON storage.objects
  FOR DELETE USING (bucket_id = 'trade-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all trade screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'trade-screenshots' AND public.is_admin(auth.uid()));

CREATE POLICY "Users read own payment proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all payment proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs' AND public.is_admin(auth.uid()));