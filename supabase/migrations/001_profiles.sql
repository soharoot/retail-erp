-- ─────────────────────────────────────────────────────────────
-- public.profiles
-- One row per auth.users row, auto-created by trigger.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'employee',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- Trigger: auto-create profile on every new signup
-- Handles both email/password and OAuth (Google, etc.)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',   -- email signup
      NEW.raw_user_meta_data->>'name'         -- Google OAuth
    ),
    NEW.raw_user_meta_data->>'avatar_url'     -- Google OAuth avatar
  )
  ON CONFLICT (id) DO NOTHING;               -- idempotent: safe to replay
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- Users can only read and update their own profile row.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Read own profile
CREATE POLICY "profiles: read own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Update own profile (name, avatar only — not role)
CREATE POLICY "profiles: update own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT via client — the trigger handles creation
-- No DELETE via client — cascade from auth.users handles it
