-- ENUMS
CREATE TYPE public.submission_status AS ENUM ('pending', 'submitted', 'graded');
CREATE TYPE public.exercise_level AS ENUM ('debutant', 'intermediaire', 'avance');

-- EXERCISES
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL,
  level public.exercise_level NOT NULL DEFAULT 'debutant',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view published exercises"
  ON public.exercises FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_published = true OR public.is_admin(auth.uid())));

CREATE POLICY "Admins manage exercises"
  ON public.exercises FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUBMISSIONS
CREATE TABLE public.exercise_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  answer TEXT,
  status public.submission_status NOT NULL DEFAULT 'pending',
  grade NUMERIC,
  coach_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  graded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, user_id)
);
ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions"
  ON public.exercise_submissions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all submissions"
  ON public.exercise_submissions FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Users insert own submissions"
  ON public.exercise_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own submissions"
  ON public.exercise_submissions FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Admins update submissions"
  ON public.exercise_submissions FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_exercise_submissions_updated_at
  BEFORE UPDATE ON public.exercise_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WEEKLY ANALYSES
CREATE TABLE public.weekly_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  market_state TEXT,
  key_news TEXT,
  expected_direction TEXT,
  week_start DATE NOT NULL DEFAULT (date_trunc('week', now()))::date,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view published analyses"
  ON public.weekly_analyses FOR SELECT
  USING (auth.uid() IS NOT NULL AND (is_published = true OR public.is_admin(auth.uid())));
CREATE POLICY "Admins manage analyses"
  ON public.weekly_analyses FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_weekly_analyses_updated_at
  BEFORE UPDATE ON public.weekly_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();