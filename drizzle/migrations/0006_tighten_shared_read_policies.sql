DROP POLICY IF EXISTS "Authenticated read news" ON public.economic_news;
CREATE POLICY "Members read news" ON public.economic_news FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'subscriber') OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'active'));

DROP POLICY IF EXISTS "Likes readable by everyone" ON public.forum_likes;
CREATE POLICY "Likes readable by members" ON public.forum_likes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Replies readable by everyone" ON public.forum_replies;
CREATE POLICY "Replies readable by members" ON public.forum_replies FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Topics readable by everyone" ON public.forum_topics;
CREATE POLICY "Topics readable by members" ON public.forum_topics FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read leaderboard stats" ON public.trader_monthly_stats;
CREATE POLICY "Leaderboard stats of opted-in traders" ON public.trader_monthly_stats FOR SELECT TO anon, authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = trader_monthly_stats.user_id AND p.show_on_leaderboard = true AND p.is_flagged = false));

DROP POLICY IF EXISTS "Forum media authenticated read" ON storage.objects;
CREATE POLICY "Forum media authenticated read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'forum-media' AND (owner_id = (select auth.uid()::text) OR (storage.foldername(name))[1] = (select auth.uid()::text) OR EXISTS (SELECT 1 FROM public.forum_replies r WHERE r.attachment_path = objects.name AND auth.uid() IS NOT NULL)));