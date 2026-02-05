import { useState, useEffect, useCallback } from 'react';
import { Volume2, Play, Square, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TTSSettingsProps {
  language: 'it' | 'en';
}

export function TTSSettings({ language }: TTSSettingsProps) {
  const { user } = useAuth();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const t = {
    it: {
      title: 'Sintesi Vocale',
      description: 'Scegli la voce e regola le impostazioni di lettura',
      voiceLabel: 'Voce',
      rateLabel: 'Velocità',
      pitchLabel: 'Tono',
      noVoices: 'Nessuna voce disponibile',
      testVoice: 'Prova',
      stopVoice: 'Stop',
      testText: 'Questa è una prova della voce selezionata con le impostazioni attuali.',
      settingsSaved: 'Impostazioni salvate',
      slow: 'Lento',
      fast: 'Veloce',
      low: 'Basso',
      high: 'Alto',
    },
    en: {
      title: 'Text-to-Speech',
      description: 'Choose the voice and adjust reading settings',
      voiceLabel: 'Voice',
      rateLabel: 'Speed',
      pitchLabel: 'Pitch',
      noVoices: 'No voices available',
      testVoice: 'Test',
      stopVoice: 'Stop',
      testText: 'This is a test of the selected voice with current settings.',
      settingsSaved: 'Settings saved',
      slow: 'Slow',
      fast: 'Fast',
      low: 'Low',
      high: 'High',
    },
  };

  const texts = t[language];

  // Save settings to database
  const saveToDatabase = useCallback(async (voiceName: string, newRate: number, newPitch: number) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tts_voice_name: voiceName || null,
          tts_rate: newRate,
          tts_pitch: newPitch,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success(texts.settingsSaved);
    } catch (error) {
      console.error('Error saving TTS settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, texts.settingsSaved]);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('tts_voice_name, tts_rate, tts_pitch')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          if (data.tts_voice_name) setSelectedVoice(data.tts_voice_name);
          if (data.tts_rate) setRate(Number(data.tts_rate));
          if (data.tts_pitch) setPitch(Number(data.tts_pitch));
        }
      } catch (error) {
        console.error('Error loading TTS settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // If no voice is selected yet, default to Italian
      if (!selectedVoice && availableVoices.length > 0) {
        const italianVoice = availableVoices.find(v => v.lang.startsWith('it'));
        if (italianVoice) {
          setSelectedVoice(italianVoice.name);
        } else {
          setSelectedVoice(availableVoices[0].name);
        }
      }
    };

    loadVoices();
    
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [selectedVoice]);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    saveToDatabase(voiceName, rate, pitch);
  };

  const handleRateChange = (value: number[]) => {
    const newRate = value[0];
    setRate(newRate);
  };

  const handleRateCommit = (value: number[]) => {
    saveToDatabase(selectedVoice, value[0], pitch);
  };

  const handlePitchChange = (value: number[]) => {
    const newPitch = value[0];
    setPitch(newPitch);
  };

  const handlePitchCommit = (value: number[]) => {
    saveToDatabase(selectedVoice, rate, value[0]);
  };

  const handleTestVoice = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const voice = voices.find(v => v.name === selectedVoice);
    if (!voice) return;

    const utterance = new SpeechSynthesisUtterance(texts.testText);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  // Group voices by language
  const groupedVoices = voices.reduce((acc, voice) => {
    const langCode = voice.lang.split('-')[0].toUpperCase();
    if (!acc[langCode]) acc[langCode] = [];
    acc[langCode].push(voice);
    return acc;
  }, {} as Record<string, SpeechSynthesisVoice[]>);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            {texts.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          {texts.title}
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>{texts.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label>{texts.voiceLabel}</Label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select value={selectedVoice} onValueChange={handleVoiceChange}>
                <SelectTrigger>
                  <SelectValue placeholder={texts.noVoices} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {Object.entries(groupedVoices).map(([lang, langVoices]) => (
                    <div key={lang}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {lang}
                      </div>
                      {langVoices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestVoice}
              disabled={!selectedVoice}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Square className="h-4 w-4" />
                  {texts.stopVoice}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {texts.testVoice}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rate Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{texts.rateLabel}</Label>
            <span className="text-sm text-muted-foreground">{rate.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-12">{texts.slow}</span>
            <Slider
              value={[rate]}
              onValueChange={handleRateChange}
              onValueCommit={handleRateCommit}
              min={0.5}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{texts.fast}</span>
          </div>
        </div>

        {/* Pitch Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{texts.pitchLabel}</Label>
            <span className="text-sm text-muted-foreground">{pitch.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-12">{texts.low}</span>
            <Slider
              value={[pitch]}
              onValueChange={handlePitchChange}
              onValueCommit={handlePitchCommit}
              min={0.5}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{texts.high}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}