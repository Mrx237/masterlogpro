ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('technique','fondamental','psychologie'));
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS daily_date date;
CREATE UNIQUE INDEX IF NOT EXISTS exercises_daily_unique ON public.exercises(daily_date, category) WHERE daily_date IS NOT NULL;