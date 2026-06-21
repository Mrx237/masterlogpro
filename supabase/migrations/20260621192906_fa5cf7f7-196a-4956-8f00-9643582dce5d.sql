ALTER TABLE public.forum_replies REPLICA IDENTITY FULL;
ALTER TABLE public.forum_topics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_topics;