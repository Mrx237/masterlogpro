-- =========================================================
-- 1. Profils : ajout pays / région / continent / username public
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS country_name text,
  ADD COLUMN IF NOT EXISTS sub_region text,
  ADD COLUMN IF NOT EXISTS continent text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_continent ON public.profiles(continent);

-- Lecture publique limitée du profil (pour afficher le leaderboard sans login)
DROP POLICY IF EXISTS "Public can view leaderboard profile fields" ON public.profiles;
CREATE POLICY "Public can view leaderboard profile fields"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (show_on_leaderboard = true);

-- =========================================================
-- 2. Table : statistiques mensuelles par trader
-- =========================================================
CREATE TABLE IF NOT EXISTS public.trader_monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_month date NOT NULL, -- premier jour du mois (saison)
  total_trades integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  total_profit_usd numeric NOT NULL DEFAULT 0,
  profit_pct numeric NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,        -- 0-100
  risk_score numeric NOT NULL DEFAULT 0,      -- 0-100
  consistency_score numeric NOT NULL DEFAULT 0, -- 0-100
  total_score numeric NOT NULL DEFAULT 0,     -- 0-100 pondéré
  rank_label text NOT NULL DEFAULT 'Rookie Trader',
  global_rank integer,
  continent_rank integer,
  country_rank integer,
  is_suspicious boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_month)
);

CREATE INDEX IF NOT EXISTS idx_tms_season ON public.trader_monthly_stats(season_month);
CREATE INDEX IF NOT EXISTS idx_tms_score ON public.trader_monthly_stats(season_month, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_tms_user ON public.trader_monthly_stats(user_id);

ALTER TABLE public.trader_monthly_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read leaderboard stats" ON public.trader_monthly_stats;
CREATE POLICY "Anyone can read leaderboard stats"
ON public.trader_monthly_stats
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage leaderboard stats" ON public.trader_monthly_stats;
CREATE POLICY "Admins manage leaderboard stats"
ON public.trader_monthly_stats
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trader_monthly_stats_updated_at
BEFORE UPDATE ON public.trader_monthly_stats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. Fonction : calcul du score d'un user pour un mois donné
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_trader_monthly_stats(_user_id uuid, _season date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start timestamptz := date_trunc('month', _season);
  _end   timestamptz := (date_trunc('month', _season) + interval '1 month');
  _capital numeric;
  _total_trades int;
  _wins int;
  _losses int;
  _profit_usd numeric;
  _profit_pct numeric;
  _win_rate numeric;
  _risk numeric;
  _consistency numeric;
  _score numeric;
  _label text;
  _suspicious boolean := false;
  _account_age_days int;
  _stddev numeric;
  _avg_result numeric;
BEGIN
  SELECT COALESCE(initial_capital, 1000),
         GREATEST(EXTRACT(day FROM (now() - created_at))::int, 0)
    INTO _capital, _account_age_days
  FROM public.profiles
  WHERE id = _user_id;

  IF _capital IS NULL OR _capital <= 0 THEN _capital := 1000; END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'win'),
    COUNT(*) FILTER (WHERE status = 'loss'),
    COALESCE(SUM(result_usd), 0),
    COALESCE(STDDEV_SAMP(result_usd), 0),
    COALESCE(AVG(result_usd), 0)
  INTO _total_trades, _wins, _losses, _profit_usd, _stddev, _avg_result
  FROM public.trades
  WHERE user_id = _user_id
    AND trade_at >= _start
    AND trade_at < _end;

  _profit_pct := CASE WHEN _capital > 0 THEN (_profit_usd / _capital) * 100 ELSE 0 END;

  _win_rate := CASE WHEN _total_trades > 0
                    THEN (_wins::numeric / _total_trades) * 100
                    ELSE 0 END;

  -- Risk control (0-100) : pénalise les très grosses pertes individuelles
  _risk := GREATEST(
    0,
    LEAST(100,
      100 - (
        SELECT COALESCE(MAX(ABS(result_usd)) / NULLIF(_capital, 0) * 100 * 5, 0)
        FROM public.trades
        WHERE user_id = _user_id
          AND trade_at >= _start AND trade_at < _end
          AND result_usd IS NOT NULL
      )
    )
  );

  -- Consistency : moins l'écart-type est grand par rapport à |moyenne|, mieux c'est
  _consistency := CASE
    WHEN _total_trades < 3 THEN 30
    WHEN ABS(_avg_result) < 0.0001 THEN 0
    ELSE GREATEST(0, LEAST(100, 100 - LEAST(100, (_stddev / GREATEST(ABS(_avg_result), 1)) * 10)))
  END;

  -- Score total pondéré (max théorique borné à 100)
  _score := LEAST(100, GREATEST(0,
      (LEAST(GREATEST(_profit_pct, -100), 100) * 0.40)
    + (_win_rate * 0.25)
    + (_risk * 0.20)
    + (_consistency * 0.15)
  ));

  -- Rang label
  _label := CASE
    WHEN _score >= 85 THEN 'Master Trader'
    WHEN _score >= 70 THEN 'Elite Trader'
    WHEN _score >= 55 THEN 'Pro Trader'
    WHEN _score >= 35 THEN 'Trader'
    ELSE 'Rookie Trader'
  END;

  -- Détection de comptes suspects : trop régulier + profit irréaliste
  IF _total_trades >= 10
     AND _win_rate >= 95
     AND _profit_pct >= 50
     AND _stddev < (ABS(_avg_result) * 0.2) THEN
    _suspicious := true;
  END IF;

  INSERT INTO public.trader_monthly_stats (
    user_id, season_month, total_trades, wins, losses,
    total_profit_usd, profit_pct, win_rate, risk_score,
    consistency_score, total_score, rank_label, is_suspicious,
    computed_at
  )
  VALUES (
    _user_id, date_trunc('month', _season)::date, _total_trades, _wins, _losses,
    _profit_usd, _profit_pct, _win_rate, _risk,
    _consistency, _score, _label, _suspicious, now()
  )
  ON CONFLICT (user_id, season_month) DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    total_profit_usd = EXCLUDED.total_profit_usd,
    profit_pct = EXCLUDED.profit_pct,
    win_rate = EXCLUDED.win_rate,
    risk_score = EXCLUDED.risk_score,
    consistency_score = EXCLUDED.consistency_score,
    total_score = EXCLUDED.total_score,
    rank_label = EXCLUDED.rank_label,
    is_suspicious = EXCLUDED.is_suspicious,
    computed_at = now();

  -- Auto-verified : >= 30 trades cumulés et compte > 30 jours
  IF _account_age_days >= 30 THEN
    UPDATE public.profiles
       SET is_verified = true
     WHERE id = _user_id
       AND is_verified = false
       AND is_flagged = false
       AND (SELECT COUNT(*) FROM public.trades WHERE user_id = _user_id) >= 30;
  END IF;

  -- Auto-flag si suspicieux
  IF _suspicious THEN
    UPDATE public.profiles SET is_flagged = true WHERE id = _user_id;
  END IF;
END;
$$;

-- =========================================================
-- 4. Fonction : recalcul global + rangs (à appeler par cron / refresh button)
-- =========================================================
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _season date := date_trunc('month', now())::date;
  _user_id uuid;
  _processed int := 0;
BEGIN
  FOR _user_id IN
    SELECT DISTINCT user_id
    FROM public.trades
    WHERE trade_at >= _season AND trade_at < (_season + interval '1 month')
  LOOP
    PERFORM public.compute_trader_monthly_stats(_user_id, _season);
    _processed := _processed + 1;
  END LOOP;

  -- Recalcule les rangs globaux
  WITH ranked AS (
    SELECT id,
      ROW_NUMBER() OVER (ORDER BY total_score DESC, total_profit_usd DESC) AS r
    FROM public.trader_monthly_stats
    WHERE season_month = _season
  )
  UPDATE public.trader_monthly_stats t
     SET global_rank = ranked.r
    FROM ranked
   WHERE t.id = ranked.id;

  -- Rang par continent
  WITH ranked AS (
    SELECT t.id,
      ROW_NUMBER() OVER (
        PARTITION BY p.continent
        ORDER BY t.total_score DESC, t.total_profit_usd DESC
      ) AS r
    FROM public.trader_monthly_stats t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.season_month = _season AND p.continent IS NOT NULL
  )
  UPDATE public.trader_monthly_stats t
     SET continent_rank = ranked.r
    FROM ranked
   WHERE t.id = ranked.id;

  -- Rang par pays
  WITH ranked AS (
    SELECT t.id,
      ROW_NUMBER() OVER (
        PARTITION BY p.country_code
        ORDER BY t.total_score DESC, t.total_profit_usd DESC
      ) AS r
    FROM public.trader_monthly_stats t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.season_month = _season AND p.country_code IS NOT NULL
  )
  UPDATE public.trader_monthly_stats t
     SET country_rank = ranked.r
    FROM ranked
   WHERE t.id = ranked.id;

  RETURN jsonb_build_object('processed', _processed, 'season', _season);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_leaderboard() TO anon, authenticated;