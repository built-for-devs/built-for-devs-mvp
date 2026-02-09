-- Migration: Auto-create profile (and developer record) on signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role;
  _full_name text;
  _dev_id uuid;
BEGIN
  -- Extract role and name from signup metadata
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'developer')::user_role;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
