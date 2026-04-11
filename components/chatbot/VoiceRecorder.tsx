'use client';

import React, { useRef, useEffect } from 'react';
import { useChatbot } from '@/context/ChatbotContext';
import { useToast } from '@/components/admin/shared/Toast';
import { cleanResponse } from '@/utils/cleanResponse';

interface VoiceRecorderProps {
  language: 'HINGLISH' | 'EN';
  status: 'idle' | 'listening' | 'processing';
  onStatusChange: (status: 'idle' | 'listening' | 'processing') => void;
  onTranscriptPreview: (text: string) => void;
  onTranscript: (text: string, isVoiceInitiated: boolean) => void;
}

type SpeechRecognitionResultLike = {
  0: { transcript: string };
  isFinal: boolean;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type BuddyWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    _buddyMicActive?: boolean;
    _buddyMicStream?: MediaStream;
  };

export default function VoiceRecorder({
  language,
  status,
  onStatusChange,
  onTranscriptPreview,
  onTranscript,
}: VoiceRecorderProps) {
  const { isListening, setIsListening, stopTtsAudio, isTyping, isSpeaking, isGeneratingTts } = useChatbot();
  const { showToast } = useToast();
  const buddyWindow = window as BuddyWindow;
  const recordingRef = useRef<{
    mediaRecorder: MediaRecorder | null;
    chunks: Blob[];
    finalTranscript: string;
    interimTranscript: string;
    recognition: SpeechRecognitionLike | null;
    startTime: number;
  }>({
    mediaRecorder: null,
    chunks: [],
    finalTranscript: '',
    interimTranscript: '',
    recognition: null,
    startTime: 0,
  });

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHandlingStopRef = useRef(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    const currentWindow = window as BuddyWindow;

    const stopRecordingNow = () => {
      const recorder = recordingRef.current.mediaRecorder;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    const SpeechRecognition = currentWindow.SpeechRecognition || currentWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'HINGLISH' ? 'hi-IN' : 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      recordingRef.current.interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          recordingRef.current.finalTranscript += `${transcript} `;
        } else {
          recordingRef.current.interimTranscript = transcript;
        }
      }

      onTranscriptPreview(
        (recordingRef.current.finalTranscript + recordingRef.current.interimTranscript).trimStart()
      );

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        if (currentWindow._buddyMicActive) {
          stopRecordingNow();
        }
      }, 10000);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      if (['no-speech', 'audio-capture', 'aborted'].includes(event.error)) {
        console.log('[STT] Non-fatal error:', event.error);
        return;
      }
      console.error('[STT] Error:', event.error);
    };

    recognition.onend = () => {
      if (currentWindow._buddyMicActive) {
        try {
          recognition.start();
        } catch {
          console.log('[STT] Recognition already running or finished');
        }
      }
    };

    recordingRef.current.recognition = recognition;
    const recognitionInstance = recognition;

    return () => {
      recognitionInstance.stop();
    };
  }, [language, onTranscriptPreview]);

  const startRecording = async () => {
    if (isTyping) {
        showToast('Please wait for Buddy to finish typing...', 'error');
        return;
    }

    if (isStartingRef.current || buddyWindow._buddyMicActive) {
      return;
    }

    isStartingRef.current = true;

    try {
      let stream: MediaStream;
      if (buddyWindow._buddyMicStream) {
        stream = buddyWindow._buddyMicStream;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        buddyWindow._buddyMicStream = stream;
      }

      const supportedTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/wav'];
      const mimeType =
        supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      recordingRef.current.mediaRecorder = mediaRecorder;
      recordingRef.current.chunks = [];
      recordingRef.current.finalTranscript = '';
      recordingRef.current.interimTranscript = '';
      recordingRef.current.startTime = Date.now();
      onTranscriptPreview('');

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingRef.current.chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start(250);

      if (recordingRef.current.recognition) {
        try {
          recordingRef.current.recognition.start();
        } catch {
          console.log('[STT] Recognition already started');
        }
      }

      buddyWindow._buddyMicActive = true;
      setIsListening(true);
      onStatusChange('listening');

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      silenceTimerRef.current = setTimeout(() => {
        if (buddyWindow._buddyMicActive) {
          stopRecording();
        }
      }, 10000);
    } catch (err: unknown) {
      console.error('[VoiceRecorder] Error starting recording:', err);
      setIsListening(false);
      buddyWindow._buddyMicActive = false;
      onStatusChange('idle');

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          showToast('Microphone permission denied. Enable it in browser settings.', 'error');
        } else if (err.name === 'NotFoundError') {
          showToast('No microphone detected. Please connect a microphone.', 'error');
        } else if (err.name === 'NotReadableError') {
          showToast('Microphone is in use by another application. Close it and try again.', 'error');
        } else {
          showToast('Unable to access microphone. Please check device permissions.', 'error');
        }
      } else {
        showToast('Microphone error. Please try again.', 'error');
      }
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleRecordingStop = async () => {
    if (isHandlingStopRef.current) return;
    isHandlingStopRef.current = true;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    if (recordingRef.current.recognition) {
      recordingRef.current.recognition.stop();
    }

    onStatusChange('processing');

    const mimeType = recordingRef.current.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(recordingRef.current.chunks, { type: mimeType });

    console.log('[VoiceRecorder] Captured audio bytes:', audioBlob.size);

    let processedCorrectly = false;

    if (audioBlob.size < 1000) {
      showToast('No audio detected, try again.', 'error');
      setIsListening(false);
      buddyWindow._buddyMicActive = false;
      onTranscriptPreview('');
      onStatusChange('idle');
      isHandlingStopRef.current = false;
      return;
    }

    try {
      const langCode = language === 'HINGLISH' ? 'hi-IN' : 'en-IN';
 
      console.log('[VoiceRecorder] Sending to ASR via centralized utility...', {
        size: audioBlob.size,
        langCode,
      });
 
      const { speechToText } = await import('@/utils/sarvamAI');
      const saarasTranscript = await speechToText(audioBlob, langCode);
 
      if (saarasTranscript) {
        const finalText = cleanResponse(saarasTranscript);
        onTranscriptPreview(finalText);
        processedCorrectly = true;
        onTranscript(finalText, true);
      } else {
        console.warn('[VoiceRecorder] Centralized utility returned empty transcript');
        throw new Error('Empty transcript from ASR utility');
      }
    } catch (err: unknown) {
      console.error('[VoiceRecorder] Saaras ASR error:', err);
      const webSpeechText = (recordingRef.current.finalTranscript || '').trim();
      if (webSpeechText) {
        console.log('[VoiceRecorder] Falling back to Web Speech API transcript.');
        const finalText = cleanResponse(webSpeechText);
        onTranscriptPreview(finalText);
        processedCorrectly = true;
        onTranscript(finalText, true);
      } else {
        showToast('Voice processing failed. Try again.', 'error');
        onTranscriptPreview('');
      }
    } finally {
      setIsListening(false);
      buddyWindow._buddyMicActive = false;
      // Note: If successfully handed off to ChatbotInput, do not forcefully set idle,
      // as the LLM (isTyping) logic will govern the macro state now.
      if (!processedCorrectly) {
        onStatusChange('idle');
      }
      isHandlingStopRef.current = false;
    }
  };

  const stopRecording = () => {
    buddyWindow._buddyMicActive = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recordingRef.current.recognition) {
      try {
        recordingRef.current.recognition.stop();
      } catch {
        // ignore recognition stop race
      }
    }

    setIsListening(false);

    const recorder = recordingRef.current.mediaRecorder;
    if (recorder && recorder.state !== 'inactive') {
      onStatusChange('processing');
      recorder.stop();
      return;
    }

    onStatusChange('idle');
  };

  const toggleMic = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If currently listening to user's mic, click stops it
    if (status === 'listening' || isListening || buddyWindow._buddyMicActive) {
      stopRecording();
    } 
    // If the bot is actively talking (TTS playing) OR generating TTS OR typing out response
    else if (isSpeaking || isGeneratingTts || isTyping) {
      stopTtsAudio(); // This stops generating or playing TTS!
      // Do nothing else. User just wanted to quiet the bot.
    } 
    else {
      // Idle. Click to start recording.
      void startRecording();
    }
  };

  const isGloballyProcessing = status === 'processing';

  return (
    <button
      onClick={toggleMic}
      disabled={isGloballyProcessing}
      data-voice-button="true"
      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all duration-300 ${
        isGloballyProcessing
          ? 'bg-amber-500 border border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-wait'
          : status === 'listening' || isListening || buddyWindow._buddyMicActive
            ? 'bg-red-500 border border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
            : 'bg-[#1e293b] border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
      }`}
      title={
        isGloballyProcessing
          ? 'Processing request'
          : status === 'listening' || isListening || buddyWindow._buddyMicActive
            ? 'Stop recording (Alt+V)'
            : 'Speak to Buddy (Alt+V)'
      }
      aria-label={
        isGloballyProcessing
          ? 'Processing input'
          : status === 'listening' || isListening || buddyWindow._buddyMicActive
            ? 'Stop voice input'
            : 'Start voice input'
      }
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {isGloballyProcessing ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 8v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z"
          />
        ) : isListening ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        )}
      </svg>
    </button>
  );
}
