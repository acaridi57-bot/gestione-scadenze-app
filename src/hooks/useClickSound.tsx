import { useCallback, useRef } from 'react';

// Check if sounds are enabled from localStorage
export function isSoundEnabled(): boolean {
  const stored = localStorage.getItem('app-sounds-enabled');
  return stored === null ? true : stored === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem('app-sounds-enabled', String(enabled));
}

export function useClickSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playClick = useCallback(() => {
    if (!isSoundEnabled()) return;
    
    try {
      // Create audio context on demand (for browser autoplay policy)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Create a short click sound using oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configure click sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.03);
      
      // Very short duration with quick fade
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    } catch (error) {
      // Silently fail if audio is not supported
      console.log('Click sound not available');
    }
  }, []);

  return { playClick };
}

// Global click sound instance for use in Button component
let globalAudioContext: AudioContext | null = null;

export function playGlobalClick() {
  if (!isSoundEnabled()) return;
  
  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = globalAudioContext;
    const now = ctx.currentTime;
    
    // Creare suono stile Windows - due toni brevi
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Primo tono - più alto (stile Windows click)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1800, now);
    osc1.frequency.exponentialRampToValueAtTime(1400, now + 0.02);
    
    // Secondo tono - armonico
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2400, now);
    osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.02);
    
    // Volume e fade
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.05);
    osc2.stop(now + 0.05);
  } catch (error) {
    // Silently fail
  }
}
