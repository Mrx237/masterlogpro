CREATE OR REPLACE FUNCTION public.has_journal_access(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('admin','subscriber'))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND status = 'active'));
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_privileged()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
       OR NEW.status IS DISTINCT FROM OLD.status OR NEW.subscription_ends_at IS DISTINCT FROM OLD.subscription_ends_at THEN
      RAISE EXCEPTION 'Modification non autorisée.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_privileged ON public.profiles;
CREATE TRIGGER guard_profile_privileged BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged();

CREATE OR REPLACE FUNCTION public.guard_topic_pin()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN NEW.is_pinned := false;
    ELSIF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned THEN RAISE EXCEPTION 'Épinglage réservé aux administrateurs.';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_topic_pin ON public.forum_topics;
CREATE TRIGGER guard_topic_pin BEFORE INSERT OR UPDATE ON public.forum_topics FOR EACH ROW EXECUTE FUNCTION public.guard_topic_pin();

CREATE OR REPLACE FUNCTION public.guard_submission_grade()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND NOT public.is_admin(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.grade IS NOT NULL OR NEW.coach_feedback IS NOT NULL OR NEW.status = 'graded' OR NEW.graded_at IS NOT NULL OR NEW.graded_by IS NOT NULL THEN
        RAISE EXCEPTION 'Correction réservée au coach.';
      END IF;
    ELSE
      IF OLD.status = 'graded' OR NEW.grade IS DISTINCT FROM OLD.grade OR NEW.coach_feedback IS DISTINCT FROM OLD.coach_feedback
         OR NEW.status = 'graded' OR NEW.graded_at IS DISTINCT FROM OLD.graded_at OR NEW.graded_by IS DISTINCT FROM OLD.graded_by THEN
        RAISE EXCEPTION 'Correction réservée au coach.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_submission_grade ON public.exercise_submissions;
CREATE TRIGGER guard_submission_grade BEFORE INSERT OR UPDATE ON public.exercise_submissions FOR EACH ROW EXECUTE FUNCTION public.guard_submission_grade();

DROP POLICY IF EXISTS "Users insert own trades" ON public.trades;
CREATE POLICY "Users insert own trades" ON public.trades FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_journal_access(auth.uid()));
DROP POLICY IF EXISTS "Users update own trades" ON public.trades;
CREATE POLICY "Users update own trades" ON public.trades FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_journal_access(auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.has_journal_access(auth.uid()));
DROP POLICY IF EXISTS "Users CRUD own trades select" ON public.trades;
CREATE POLICY "Users CRUD own trades select" ON public.trades FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.has_journal_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.internal_job_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_job_tokens TO service_role;
ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_job_tokens (name) VALUES ('fetch_news') ON CONFLICT DO NOTHING;