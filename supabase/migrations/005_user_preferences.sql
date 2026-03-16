-- ============================================================
-- 005_user_preferences.sql — Per-user appearance preferences
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme            TEXT        NOT NULL DEFAULT 'system',
  interface_style  TEXT        NOT NULL DEFAULT 'default',
  dashboard_layout TEXT        NOT NULL DEFAULT 'grid',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Each user can only read and write their own preferences
CREATE POLICY "user_preferences: users manage their own"
  ON public.user_preferences FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-update timestamp on every write
DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON public.user_preferences;

CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
