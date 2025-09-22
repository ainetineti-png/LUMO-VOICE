
import { useState, useRef, useCallback, useEffect } from 'react';

// FIX: Add types for Web Speech API
// The SpeechRecognition APIs are not part of the standard TypeScript DOM library,
// causing compilation errors. These definitions provide the necessary types.
interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

type SpeechRecognitionStatic = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

// FIX: Rename variable to avoid shadowing the `SpeechRecognition` type.
const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

interface UseSpeechProps {
  onResult: (text: string) => void;
  onSpeechEnd: () => void;
  onInterrupt: () => void;
}

export const useSpeech = ({ onResult, onSpeechEnd, onInterrupt }: UseSpeechProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const onSpeechEndRef = useRef(onSpeechEnd);
  onSpeechEndRef.current = onSpeechEnd;

  const onInterruptRef = useRef(onInterrupt);
  onInterruptRef.current = onInterrupt;

  useEffect(() => {
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript) {
        onResultRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length === 0) return;

      setVoices(allVoices);

      // Only set a default if one isn't selected yet.
      if (selectedVoice === null) {
        const voicePreferences = [
          (v: SpeechSynthesisVoice) => v.lang === 'en-IN' && v.name.toLowerCase().includes('female'),
          (v: SpeechSynthesisVoice) => v.lang === 'en-IN',
          (v: SpeechSynthesisVoice) => v.lang === 'en-GB' && v.name.toLowerCase().includes('female'),
          (v: SpeechSynthesisVoice) => v.lang === 'en-US' && v.name.toLowerCase().includes('female'),
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en-') && v.name.toLowerCase().includes('female'),
          (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('female'),
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en-'),
        ];

        let preferredVoice: SpeechSynthesisVoice | undefined;
        for (const condition of voicePreferences) {
          preferredVoice = allVoices.find(condition);
          if (preferredVoice) break;
        }
        
        setSelectedVoice(preferredVoice || allVoices[0] || null);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = null;
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopMonitoring = useCallback(() => {
    if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
    }
    if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
    }
  }, []);

  const startMonitoringForInterrupt = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported for interruption.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            microphoneStreamRef.current = stream;
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.1;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            // This threshold may need tuning based on mic sensitivity
            const INTERRUPTION_THRESHOLD = 50; 
            let consecutiveAboveThreshold = 0;

            const monitor = () => {
                if (!analyser) return;
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

                if (average > INTERRUPTION_THRESHOLD) {
                    consecutiveAboveThreshold++;
                } else {
                    consecutiveAboveThreshold = 0;
                }

                // Require a few consecutive frames above threshold to avoid noise triggers
                if (consecutiveAboveThreshold > 3) { 
                    onInterruptRef.current();
                } else {
                    animationFrameIdRef.current = requestAnimationFrame(monitor);
                }
            };
            monitor();
        })
        .catch(err => {
            console.error('Could not get microphone for interruption monitoring:', err);
        });
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setIsListening(false);
      }
    }
  }, [isListening, isSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition", e);
      } finally {
        setIsListening(false);
      }
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;

    stopListening();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // FIX: Keep a reference to the utterance to prevent it from being garbage-collected prematurely.
    utteranceRef.current = utterance;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 1.2; 

    utterance.onstart = () => {
        setIsSpeaking(true);
        startMonitoringForInterrupt();
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      stopMonitoring();
      onSpeechEndRef.current();
      utteranceRef.current = null;
    };
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      stopMonitoring();
      onSpeechEndRef.current();
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  }, [stopListening, selectedVoice, startMonitoringForInterrupt, stopMonitoring]);
  
  const cancelInteraction = useCallback(() => {
    stopListening();
    if(window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    stopMonitoring();
    utteranceRef.current = null;
  }, [stopListening, stopMonitoring]);

  return { 
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speak,
    cancelInteraction,
    voices,
    selectedVoice,
    setVoice: setSelectedVoice,
  };
};
