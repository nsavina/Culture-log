-- Free-text prompt for personalizing recommendations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prompt text;
