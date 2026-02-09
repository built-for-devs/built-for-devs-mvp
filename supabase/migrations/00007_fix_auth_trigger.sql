-- Fix: auth trigger needs explicit search_path and proper error handling

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.user_role;
  _full_name text;
BEGIN
  -- Extract role and name from signup metadata
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'developer')::public.user_role;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, _full_name, _role);

  -- If developer, also create developer record
  IF _role = 'developer' THEN
    INSERT INTO public.developers (profile_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
