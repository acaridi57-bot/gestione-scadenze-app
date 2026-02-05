-- Add TTS preferences columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tts_voice_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tts_rate numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS tts_pitch numeric DEFAULT 1.0;