'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

type BuddyWindow = Window & typeof globalThis & { _buddyLanguage?: 'english' | 'hinglish' };

type PersistedMessage = Omit<Message, 'timestamp' | 'autoPlayTts'> & { timestamp: string };

function detectAudioMime(base64Audio: string): string {
  if (!base64Audio) return 'audio/mpeg';

  if (base64Audio.startsWith('UklGR')) return 'audio/wav';
  if (base64Audio.startsWith('SUQz') || base64Audio.startsWith('/+MY')) return 'audio/mpeg';
  if (base64Audio.startsWith('T2dn')) return 'audio/ogg';
  if (base64Audio.startsWith('fLaC')) return 'audio/flac';

  return 'audio/mpeg';
}

export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isError?: boolean;
  isVoiceInitiated?: boolean;
  autoPlayTts?: boolean;
  isLowConfidence?: boolean;
}

interface ChatbotContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: Message[];
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  speakingMessageId: string | null;
  playTtsAudio: (messageId: string, audioBase64: string) => Promise<void>;
  stopTtsAudio: () => void;
  buddyLanguage: 'english' | 'hinglish';
  setBuddyLanguage: (lang: 'english' | 'hinglish') => void;
  isBuddyVisible: boolean;
  setIsBuddyVisible: (visible: boolean) => void;
  isQuizActive: boolean;
  setIsQuizActive: (active: boolean) => void;
  getTtsCancelToken: () => number;
}

const ChatbotContext = createContext<ChatbotContextType | null>(null);

function getInitialBuddyLanguage(): 'english' | 'hinglish' {
  if (typeof window === 'undefined') return 'english';
  const saved = localStorage.getItem('ks_buddy_language');
  if (saved === 'english' || saved === 'hinglish') return saved;
  const appLanguage = localStorage.getItem('ks_language');
  if (appLanguage === 'HINGLISH') return 'hinglish';
  return 'english';
}

function getInitialBuddyVisible(): boolean {
  // Keep initial render deterministic to avoid hydration mismatches in layout controls.
  return true;
}

function getInitialMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  const saved = sessionStorage.getItem('ks_chat_history');
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as PersistedMessage[];
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp), autoPlayTts: false }));
  } catch {
    return [];
  }
}

export const ChatbotProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [buddyLanguage, setBuddyLanguage] = useState<'english' | 'hinglish'>(getInitialBuddyLanguage);
  const [isBuddyVisible, setIsBuddyVisible] = useState<boolean>(getInitialBuddyVisible);
  const [isQuizActive, setIsQuizActive] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCancelTokenRef = useRef(0);

  // Save to sessionStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const last5 = messages.slice(-5).map((message) => ({ ...message, autoPlayTts: undefined }));
      sessionStorage.setItem('ks_chat_history', JSON.stringify(last5));
    }
  }, [messages]);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    const newMsg: Message = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };
    setMessages((prev) => {
      const updated = [...prev, newMsg];
      return updated.slice(-5);
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem('ks_chat_history');
  }, []);

  useEffect(() => {
    localStorage.setItem('ks_buddy_language', buddyLanguage);
    const buddyWindow = window as BuddyWindow;
    buddyWindow._buddyLanguage = buddyLanguage;
  }, [buddyLanguage]);

  useEffect(() => {
    localStorage.setItem('ks_buddy_visible', isBuddyVisible.toString());
  }, [isBuddyVisible]);

  const stopTtsAudio = useCallback(() => {
    ttsCancelTokenRef.current += 1;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, []);

  const getTtsCancelToken = useCallback(() => {
    return ttsCancelTokenRef.current;
  }, []);

  const playTtsAudio = useCallback(
    (messageId: string, audioBase64: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        stopTtsAudio();

        const src = audioBase64.startsWith('data:audio')
          ? audioBase64
          : `data:${detectAudioMime(audioBase64)};base64,${audioBase64}`;
        const audio = new Audio(src);
        audioRef.current = audio;
        setIsSpeaking(true);
        setSpeakingMessageId(messageId);

        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          setIsSpeaking(false);
          setSpeakingMessageId(null);
          resolve();
        };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  }, [stopTtsAudio]);

  useEffect(() => {
    return () => {
      stopTtsAudio();
    };
  }, [stopTtsAudio]);

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        addMessage,
        clearMessages,
        isTyping,
        setIsTyping,
        activeCourseId,
        setActiveCourseId,
        isListening,
        setIsListening,
        isSpeaking,
        setIsSpeaking,
        speakingMessageId,
        playTtsAudio,
        stopTtsAudio,
        getTtsCancelToken,
        buddyLanguage,
        setBuddyLanguage,
        isBuddyVisible,
        setIsBuddyVisible,
        isQuizActive,
        setIsQuizActive,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
};

export const useChatbot = () => {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error('useChatbot must be inside ChatbotProvider');
  return ctx;
};
