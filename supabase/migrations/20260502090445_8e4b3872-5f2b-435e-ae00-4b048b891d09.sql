-- Recalcule pour TOUS les users qui ont au moins 1 trade scoré (win/loss) sur la saison
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
    WHERE status IN ('win','loss')
      AND trade_at >= _season
      AND trade_at < (_season + interval '1 month')
    UNION
    -- Inclus aussi les users avec au moins un trade scoré historique
    -- (utile pour comptes avec activité récente hors mois en cours)
    SELECT DISTINCT user_id
    FROM public.trades
    WHERE status IN ('win','loss')
  LOOP
    PERFORM public.compute_trader_monthly_stats(_user_id, _season);
    _processed := _processed + 1;
  END LOOP;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC, total_profit_usd DESC) AS r
    FROM public.trader_monthly_stats WHERE season_month = _season
  )
  UPDATE public.trader_monthly_stats t SET global_rank = ranked.r
    FROM ranked WHERE t.id = ranked.id;

  WITH ranked AS (
    SELECT t.id, ROW_NUMBER() OVER (PARTITION BY p.continent ORDER BY t.total_score DESC, t.total_profit_usd DESC) AS r
    FROM public.trader_monthly_stats t JOIN public.profiles p ON p.id = t.user_id
    WHERE t.season_month = _season AND p.continent IS NOT NULL
  )
  UPDATE public.trader_monthly_stats t SET continent_rank = ranked.r
    FROM ranked WHERE t.id = ranked.id;

  WITH ranked AS (
    SELECT t.id, ROW_NUMBER() OVER (PARTITION BY p.country_code ORDER BY t.total_score DESC, t.total_profit_usd DESC) AS r
    FROM public.trader_monthly_stats t JOIN public.profiles p ON p.id = t.user_id
    WHERE t.season_month = _season AND p.country_code IS NOT NULL
  )
  UPDATE public.trader_monthly_stats t SET country_rank = ranked.r
    FROM ranked WHERE t.id = ranked.id;

  RETURN jsonb_build_object('processed', _processed, 'season', _season);
END;
$$;

-- Assouplit l'auto-verified : 5 trades suffisent (au lieu de 30)
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
  _total_user_trades int;
BEGIN
  SELECT COALESCE(initial_capital, 1000),
         GREATEST(EXTRACT(day FROM (now() - created_at))::int, 0)
    INTO _capital, _account_age_days
  FROM public.profiles
  WHERE id = _user_id;

  IF _capital IS NULL OR _capital <= 0 THEN _capital := 1000; END IF;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'win'),
         COUNT(*) FILTER (WHERE status = 'loss'),
         COALESCE(SUM(result_usd), 0),
         COALESCE(STDDEV_SAMP(result_usd), 0),
         COALESCE(AVG(result_usd), 0)
  INTO _total_trades, _wins, _losses, _profit_usd, _stddev, _avg_result
  FROM public.trades
  WHERE user_id = _user_id AND trade_at >= _start AND trade_at < _end;

  -- Si pas de trades dans la saison, calcule sur l'ensemble (fallback)
  IF _total_trades = 0 THEN
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE status = 'win'),
           COUNT(*) FILTER (WHERE status = 'loss'),
           COALESCE(SUM(result_usd), 0),
           COALESCE(STDDEV_SAMP(result_usd), 0),
           COALESCE(AVG(result_usd), 0)
    INTO _total_trades, _wins, _losses, _profit_usd, _stddev, _avg_result
    FROM public.trades
    WHERE user_id = _user_id AND status IN ('win','loss');
  END IF;

  IF _total_trades = 0 THEN RETURN; END IF;

  _profit_pct := CASE WHEN _capital > 0 THEN (_profit_usd / _capital) * 100 ELSE 0 END;
  _win_rate := CASE WHEN (_wins + _losses) > 0 THEN (_wins::numeric / (_wins + _losses)) * 100 ELSE 0 END;

  _risk := GREATEST(0, LEAST(100,
    100 - (
      SELECT COALESCE(MAX(ABS(result_usd)) / NULLIF(_capital, 0) * 100 * 5, 0)
      FROM public.trades
      WHERE user_id = _user_id AND result_usd IS NOT NULL
    )
  ));

  _consistency := CASE
    WHEN _total_trades < 3 THEN 30
    WHEN ABS(_avg_result) < 0.0001 THEN 0
    ELSE GREATEST(0, LEAST(100, 100 - LEAST(100, (_stddev / GREATEST(ABS(_avg_result), 1)) * 10)))
  END;

  _score := LEAST(100, GREATEST(0,
      (LEAST(GREATEST(_profit_pct, -100), 100) * 0.40)
    + (_win_rate * 0.25)
    + (_risk * 0.20)
    + (_consistency * 0.15)
  ));

  _label := CASE
    WHEN _score >= 85 THEN 'Master Trader'
    WHEN _score >= 70 THEN 'Elite Trader'
    WHEN _score >= 55 THEN 'Pro Trader'
    WHEN _score >= 35 THEN 'Trader'
    ELSE 'Rookie Trader'
  END;

  IF _total_trades >= 10 AND _win_rate >= 95 AND _profit_pct >= 50
     AND _stddev < (ABS(_avg_result) * 0.2) THEN
    _suspicious := true;
  END IF;

  INSERT INTO public.trader_monthly_stats (
    user_id, season_month, total_trades, wins, losses,
    total_profit_usd, profit_pct, win_rate, risk_score,
    consistency_score, total_score, rank_label, is_suspicious, computed_at
  ) VALUES (
    _user_id, date_trunc('month', _season)::date, _total_trades, _wins, _losses,
    _profit_usd, _profit_pct, _win_rate, _risk, _consistency, _score, _label, _suspicious, now()
  )
  ON CONFLICT (user_id, season_month) DO UPDATE SET
    total_trades = EXCLUDED.total_trades, wins = EXCLUDED.wins, losses = EXCLUDED.losses,
    total_profit_usd = EXCLUDED.total_profit_usd, profit_pct = EXCLUDED.profit_pct,
    win_rate = EXCLUDED.win_rate, risk_score = EXCLUDED.risk_score,
    consistency_score = EXCLUDED.consistency_score, total_score = EXCLUDED.total_score,
    rank_label = EXCLUDED.rank_label, is_suspicious = EXCLUDED.is_suspicious, computed_at = now();

  -- Auto-verified beaucoup plus permissif (5 trades scoré + compte > 1 jour)
  SELECT COUNT(*) INTO _total_user_trades FROM public.trades WHERE user_id = _user_id AND status IN ('win','loss');
  IF _account_age_days >= 1 AND _total_user_trades >= 5 THEN
    UPDATE public.profiles SET is_verified = true
     WHERE id = _user_id AND is_verified = false AND is_flagged = false;
  END IF;

  IF _suspicious THEN
    UPDATE public.profiles SET is_flagged = true WHERE id = _user_id;
  END IF;
END;
$$;