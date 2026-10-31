CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;
CREATE OR REPLACE FUNCTION public.validate_profile_username() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.username := nullif(lower(trim(NEW.username)), '');
  IF NEW.username IS NOT NULL AND NEW.username !~ '^[a-z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Le nom d’utilisateur doit contenir 3 à 30 lettres, chiffres ou underscores.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_validate_username BEFORE INSERT OR UPDATE OF username ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_username();
CREATE OR REPLACE FUNCTION public.forum_members(_ids uuid[] DEFAULT NULL, _search text DEFAULT NULL) RETURNS TABLE(id uuid, username text, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.full_name FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND (
    (_ids IS NOT NULL AND p.id = ANY(_ids)) OR
    (_ids IS NULL AND _search IS NOT NULL AND p.username IS NOT NULL AND lower(p.username) LIKE replace(replace(replace(lower(left(_search,30)), '\', '\\'), '%', '\%'), '_', '\_') || '%')
  ) ORDER BY p.username NULLS LAST, p.id LIMIT CASE WHEN _ids IS NULL THEN 8 ELSE 200 END;
$$;
REVOKE ALL ON FUNCTION public.forum_members(uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forum_members(uuid[], text) TO authenticated, service_role;