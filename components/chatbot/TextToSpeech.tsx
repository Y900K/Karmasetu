'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useChatbot } from '@/context/ChatbotContext';
import { sanitizeForTTS } from '@/utils/cleanResponse';

interface TextToSpeechProps {
  text: string;
  language: 'HINGLISH' | 'EN';
  messageId: string;
  autoPlay?: boolean;
}

export default function TextToSpeech({
  text,
  language,
  messageId,
  autoPlay = false,
}: TextToSpeechProps) {
  const { speakingMessageId, isSpeaking, isGeneratingTts: isGenerating, setIsGeneratingTts: setIsGenerating, playTtsAudio, stopTtsAudio, getTtsCancelToken } = useChatbot();
  const [playFailed, setPlayFailed] = useState(false);
  const [cachedAudio, setCachedAudio] = useState<string | null>(null);
  const hasAutoPlayedRef = useRef(false);

  const playBrowserFallback = useCallback(async (textToSpeak: string) => {
    return new Promise<boolean>((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return resolve(false);
      }

      const fallbackText = sanitizeForTTS(textToSpeak);
      if (!fallbackText.trim()) {
        return resolve(false);
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(fallbackText);
        utterance.lang = language === 'HINGLISH' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        resolve(false);
      }
    });
  }, [language]);

  const isThisMessageSpeaking = speakingMessageId === messageId;

  const generateAudio = useCallback(async (textToSpeak: string) => {
    try {
      if (!textToSpeak || typeof textToSpeak !== 'string') return null;

      const ttsText = sanitizeForTTS(textToSpeak);
      if (!ttsText.trim()) return null;

      const langCode = language === 'HINGLISH' ? 'hi-IN' : 'en-IN';

      const { textToSpeech } = await import('@/utils/sarvamAI');
      const audioBase64 = await textToSpeech(ttsText, langCode);

      if (!audioBase64) throw new Error('No audio content from utility');

      return audioBase64;
    } catch (err) {
      console.error('[TTS] Error generating audio:', err);
      return null;
    }
  }, [language]);

  const handleSpeakerClick = useCallback(async () => {
    const browserSpeaking = typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && window.speechSynthesis.speaking;

    const shouldStopCurrentPlayback =
      isThisMessageSpeaking ||
      (isSpeaking && speakingMessageId === messageId) ||
      browserSpeaking ||
      isGenerating;

    if (shouldStopCurrentPlayback) {
      stopTtsAudio();
      if (isGenerating) setIsGenerating(false);
      return;
    }

    setPlayFailed(false);
    
    // Stop any existing TTS *before* capturing the token
    stopTtsAudio();
    const token = getTtsCancelToken();

    if (cachedAudio) {
      try {
        await playTtsAudio(messageId, cachedAudio);
      } catch {
        if (getTtsCancelToken() !== token) return;
        const fallbackOk = await playBrowserFallback(text);
        if (getTtsCancelToken() !== token) {
           window.speechSynthesis?.cancel(); // abort late fallback
           return;
        }
        setPlayFailed(!fallbackOk);
      }
      return;
    }

    setIsGenerating(true);

    try {
      const audioBase64 = await generateAudio(text);
      if (getTtsCancelToken() !== token) return; // User stopped it during generation

      if (!audioBase64) {
        const fallbackOk = await playBrowserFallback(text);
        if (getTtsCancelToken() !== token) {
           window.speechSynthesis?.cancel();
           return;
        }
        setPlayFailed(!fallbackOk);
        return;
      }

      setCachedAudio(audioBase64);
      try {
        await playTtsAudio(messageId, audioBase64);
      } catch {
        if (getTtsCancelToken() !== token) return;
        const fallbackOk = await playBrowserFallback(text);
        if (getTtsCancelToken() !== token) {
           window.speechSynthesis?.cancel();
           return;
        }
        setPlayFailed(!fallbackOk);
      }
    } finally {
      if (getTtsCancelToken() === token) {
        setIsGenerating(false);
      } else {
        setIsGenerating(false); // Make sure to unlock regardless
      }
    }
  }, [isThisMessageSpeaking, isSpeaking, speakingMessageId, isGenerating, stopTtsAudio, cachedAudio, playTtsAudio, messageId, text, generateAudio, playBrowserFallback, getTtsCancelToken, setIsGenerating]);

  useEffect(() => {
    if (autoPlay && !hasAutoPlayedRef.current) {
      hasAutoPlayedRef.current = true;
      void handleSpeakerClick();
    }
  }, [autoPlay, handleSpeakerClick]);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => void handleSpeakerClick()}
        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all cursor-pointer border ${
          isThisMessageSpeaking || isGenerating
            ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20'
            : 'text-slate-400 border-transparent hover:border-white/10 hover:bg-white/5'
        }`}
        title={isThisMessageSpeaking || isGenerating ? 'Stop playback' : 'Listen to message'}
        aria-label={isThisMessageSpeaking || isGenerating ? 'Stop playback' : 'Read message aloud'}
      >
        {isThisMessageSpeaking ? (
          <div className="flex items-end gap-[2px] h-3">
            <div className="w-[3px] rounded-full bg-cyan-400 animate-sound-wave delay-0" />
            <div className="w-[3px] rounded-full bg-cyan-400 animate-sound-wave delay-150" />
            <div className="w-[3px] rounded-full bg-cyan-400 animate-sound-wave delay-300" />
          </div>
        ) : isGenerating ? (
           <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </button>

      {playFailed && (
        <button
          onClick={() => void handleSpeakerClick()}
          className="text-[10px] text-yellow-600 hover:text-yellow-500 transition-colors cursor-pointer"
          title="Autoplay blocked or generation failed. Click to replay."
        >
          Replay
        </button>
      )}
    </div>
  );
}
