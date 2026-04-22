-- Enums
DO $$ BEGIN
  CREATE TYPE public.news_impact_level AS ENUM ('high','medium','low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.news_sentiment AS ENUM ('bullish','bearish','neutral');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.economic_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  title text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  country text,
  event_at timestamptz NOT NULL DEFAULT now(),
  summary text,
  actual text,
  forecast text,
  previous text,
  impact public.news_impact_level NOT NULL DEFAULT 'medium',
  sentiment public.news_sentiment NOT NULL DEFAULT 'neutral',
  admin_analysis text,
  source text DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read news" ON public.economic_news
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage news" ON public.economic_news
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_economic_news_updated_at
  BEFORE UPDATE ON public.economic_news
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_economic_news_event_at ON public.economic_news (event_at DESC);
CREATE INDEX IF NOT EXISTS idx_economic_news_impact ON public.economic_news (impact);