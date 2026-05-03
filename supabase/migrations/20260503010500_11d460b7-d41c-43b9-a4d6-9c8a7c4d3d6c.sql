
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trading_experience text,
  ADD COLUMN IF NOT EXISTS trading_style text,
  ADD COLUMN IF NOT EXISTS daily_loss_limit numeric,
  ADD COLUMN IF NOT EXISTS max_risk_per_trade numeric,
  ADD COLUMN IF NOT EXISTS weekly_trade_target integer,
  ADD COLUMN IF NOT EXISTS best_streak integer DEFAULT 0;
