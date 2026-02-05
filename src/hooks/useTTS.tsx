import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TTSSettings {
  voiceName: string | null;
  rate: number;
  pitch: number;
}

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<TTSSettings>({ voiceName: null, rate: 1.0, pitch: 1.0 });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('tts_voice_name, tts_rate, tts_pitch')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            voiceName: data.tts_voice_name,
            rate: Number(data.tts_rate) || 1.0,
            pitch: Number(data.tts_pitch) || 1.0,
          });
        }
      } catch (error) {
        console.error('Error loading TTS settings:', error);
      }
    };

    loadSettings();
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      toast.error('Nessun testo da leggere');
      return;
    }

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      toast.error('Sintesi vocale non supportata dal browser');
      return;
    }

    // Stop current speech if playing
    window.speechSynthesis.cancel();

    setIsLoading(true);
    setIsPlaying(false);

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Get voice from settings or find Italian voice
      const availableVoices = window.speechSynthesis.getVoices();
      
      let selectedVoice: SpeechSynthesisVoice | undefined;
      
      if (settings.voiceName) {
        selectedVoice = availableVoices.find(v => v.name === settings.voiceName);
      }
      
      if (!selectedVoice) {
        selectedVoice = availableVoices.find(v => v.lang.startsWith('it')) || availableVoices[0];
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'it-IT';
      }
      
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;

      utterance.onstart = () => {
        setIsLoading(false);
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event) => {
        setIsPlaying(false);
        setIsLoading(false);
        utteranceRef.current = null;
        if (event.error !== 'canceled') {
          toast.error('Errore nella sintesi vocale');
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Errore nella sintesi vocale');
      setIsLoading(false);
    }
  }, [settings]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
  }, []);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
  };
}
