
-- Categories enum
CREATE TYPE public.forum_category AS ENUM ('analyse', 'strategie', 'psychologie', 'question', 'general');

-- Topics
CREATE TABLE public.forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 5 AND 160),
  content text NOT NULL CHECK (length(content) BETWEEN 10 AND 8000),
  category forum_category NOT NULL DEFAULT 'general',
  is_pinned boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_topics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_topics TO authenticated;
GRANT ALL ON public.forum_topics TO service_role;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topics readable by everyone" ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "Authenticated can create topics" ON public.forum_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own topics" ON public.forum_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners delete own topics" ON public.forum_topics FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX forum_topics_activity_idx ON public.forum_topics (is_pinned DESC, last_activity_at DESC);
CREATE INDEX forum_topics_category_idx ON public.forum_topics (category, last_activity_at DESC);

-- Replies
CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_replies TO authenticated;
GRANT ALL ON public.forum_replies TO service_role;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Replies readable by everyone" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "Authenticated can create replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update own replies" ON public.forum_replies FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owners delete own replies" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX forum_replies_topic_idx ON public.forum_replies (topic_id, created_at);

-- Likes (works for both topics and replies via target_type)
CREATE TABLE public.forum_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('topic','reply')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
GRANT SELECT ON public.forum_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.forum_likes TO authenticated;
GRANT ALL ON public.forum_likes TO service_role;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes readable by everyone" ON public.forum_likes FOR SELECT USING (true);
CREATE POLICY "Auth can like" ON public.forum_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can unlike" ON public.forum_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Triggers: updated_at
CREATE TRIGGER trg_forum_topics_updated BEFORE UPDATE ON public.forum_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_forum_replies_updated BEFORE UPDATE ON public.forum_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reply count + last activity
CREATE OR REPLACE FUNCTION public.forum_on_reply_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics
      SET reply_count = reply_count + 1, last_activity_at = now()
      WHERE id = NEW.topic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_forum_reply_count
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.forum_on_reply_change();

-- Like counts
CREATE OR REPLACE FUNCTION public.forum_on_like_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _delta int;
BEGIN
  IF TG_OP='INSERT' THEN _delta := 1;
    IF NEW.target_type='topic' THEN
      UPDATE public.forum_topics SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSE
      UPDATE public.forum_replies SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    IF OLD.target_type='topic' THEN
      UPDATE public.forum_topics SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    ELSE
      UPDATE public.forum_replies SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;$$;
CREATE TRIGGER trg_forum_like_count
AFTER INSERT OR DELETE ON public.forum_likes
FOR EACH ROW EXECUTE FUNCTION public.forum_on_like_change();
