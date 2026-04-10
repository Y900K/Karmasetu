
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatbot } from '@/context/ChatbotContext';
import { useLanguage } from '@/context/LanguageContext';
import VoiceRecorder from './VoiceRecorder';

type VoiceStatus = 'idle' | 'listening' | 'processing';

export default function ChatbotInput() {
  const [inputText, setInputText] = useState('');
  const [isVoiceInitiated, setIsVoiceInitiated] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const {
    isTyping,
    setIsTyping,
    addMessage,
    isListening,
    messages,
    buddyLanguage,
    setBuddyLanguage,
    isQuizActive,
  } = useChatbot();
  const { language } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    // Listen for the custom retry event from ChatbotErrorState.
    const handleRetry = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setInputText(customEvent.detail);
      setIsVoiceInitiated(false);
      setTimeout(() => {
        handleSendRef.current(customEvent.detail, false);
      }, 50);
    };

    window.addEventListener('ks_chatbot_retry', handleRetry);
    return () => window.removeEventListener('ks_chatbot_retry', handleRetry);
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [inputText, resizeTextarea]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleSend = useCallback(async (overrideText?: string, overrideVoiceInitiated?: boolean) => {
    const baseText = typeof overrideText === 'string' ? overrideText : inputText;
    const text = baseText.trim();
    const voiceQuery = overrideVoiceInitiated ?? isVoiceInitiated;
    const isVoiceAutoSubmit = typeof overrideText === 'string' && voiceQuery;

    if (!text || isTyping) return;
    if (!isVoiceAutoSubmit && (isListening || voiceStatus === 'processing')) return;

    addMessage({ role: 'user', content: text });

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsTyping(true);

    try {
      const sarvamMessages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }> = [];

      const systemAddendum = voiceQuery
        ? `[VOICE_INPUT] [LANGUAGE_MODE: ${buddyLanguage === 'hinglish' ? 'HINGLISH' : 'ENGLISH'}] The following question was asked via voice input. The transcript may contain minor speech recognition errors, incomplete words, or ambient noise artifacts. Intelligently infer the user's actual intent, correct obvious errors, and answer what they most likely meant to ask.`
        : `[LANGUAGE_MODE: ${buddyLanguage === 'hinglish' ? 'HINGLISH' : 'ENGLISH'}]`;

      sarvamMessages.push({ role: 'system', content: systemAddendum });

      messages.forEach((message) => {
        sarvamMessages.push({
          role: message.role === 'bot' ? 'assistant' : message.role,
          content: message.content,
        });
      });

      sarvamMessages.push({ role: 'user', content: text });

      const { chatCompletion } = await import('@/utils/sarvamAI');
      const responseText = await chatCompletion(sarvamMessages, isQuizActive);

      setIsTyping(false);
      
      const isFallback = responseText === 'My live AI connection is slow right now, but I can still help with quick safety guidance. Ask in one line with the task, hazard, or chemical name, for example: "chemical spill emergency procedure."'
          || responseText === 'मेरा live AI connection अभी slow है, लेकिन मैं quick safety help दे सकता हूं. एक line में task, hazard, या chemical का नाम लिखो, जैसे: "chemical spill emergency procedure".'
          || responseText.includes('I don\'t understand')
          || responseText.includes('mujhe samajh');

      addMessage({
        role: 'bot',
        content: responseText || '',
        isVoiceInitiated: voiceQuery,
        autoPlayTts: voiceQuery,
        isLowConfidence: isFallback,
      });

      setIsVoiceInitiated(false);
      setVoiceStatus('idle');
    } catch (error) {
      setIsTyping(false);
      setIsVoiceInitiated(false);
      setVoiceStatus('idle');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ChatbotInput] Error sending message:', errorMessage);

      let userMessage = '';
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        userMessage = language === 'HINGLISH'
          ? 'Connection timeout हो गया. कृपया फिर से कोशिश करें.'
          : 'Connection timeout. Please try again.';
      } else if (errorMessage.includes('API') || errorMessage.includes('Sarvam')) {
        userMessage = language === 'HINGLISH'
          ? 'मैं connect नहीं कर पाया. Admin से contact करें.'
          : 'I\'m unable to connect. Please contact support.';
      } else {
        userMessage = language === 'HINGLISH'
          ? 'Network error आ गई. Internet connection check करें और retry करें.'
          : 'Network error. Please check your connection and try again.';
      }

      addMessage({
        role: 'bot',
        content: userMessage,
        isError: true,
        isLowConfidence: true,
      });
    }
  }, [
    inputText,
    isTyping,
    isListening,
    isVoiceInitiated,
    voiceStatus,
    addMessage,
    setIsTyping,
    buddyLanguage,
    messages,
    language,
    isQuizActive,
  ]);

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleGlobalKeyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        const voiceButton = document.querySelector('[data-voice-button]') as HTMLButtonElement | null;
        voiceButton?.click();
      }

      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setBuddyLanguage(buddyLanguage === 'english' ? 'hinglish' : 'english');
      }
    };

    if (handleGlobalKeyDownRef.current) {
      window.removeEventListener('keydown', handleGlobalKeyDownRef.current);
    }

    handleGlobalKeyDownRef.current = handleGlobalKeyDown;
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      if (handleGlobalKeyDownRef.current) {
        window.removeEventListener('keydown', handleGlobalKeyDownRef.current);
      }
    };
  }, [buddyLanguage, setBuddyLanguage]);

  const isSendDisabled =
    inputText.trim() === '' || isListening || isTyping || voiceStatus === 'processing';

  const inputPlaceholder =
    voiceStatus === 'processing'
      ? 'Processing...'
      : voiceStatus === 'listening' && inputText.trim() === ''
        ? 'Listening...'
        : buddyLanguage === 'hinglish'
          ? 'Buddy से पूछें...'
          : 'Ask Buddy AI about training...';

  return (
    <div className="shrink-0 border-t border-white/10 bg-[#0f172a]/95 p-2.5 pb-safe backdrop-blur-md sm:p-3">
      <div className="relative flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={inputPlaceholder}
          className="no-scrollbar min-h-[42px] max-h-[120px] flex-1 resize-none rounded-2xl border border-white/10 bg-[#1e293b]/80 px-3.5 py-2.5 text-[13px] text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:bg-[#1e293b] focus:ring-4 focus:ring-cyan-500/10 sm:px-4 sm:py-3 sm:text-sm"
          rows={1}
          aria-label="Message input"
          aria-describedby="input-help"
        />
        <div id="input-help" className="sr-only">Press Enter to send, Shift+Enter for new line</div>

        <VoiceRecorder
          language={buddyLanguage === 'hinglish' ? 'HINGLISH' : 'EN'}
          status={voiceStatus}
          onStatusChange={setVoiceStatus}
          onTranscriptPreview={setInputText}
          onTranscript={(text, isVoice) => {
            setInputText(text);
            setIsVoiceInitiated(isVoice);
            void handleSend(text, isVoice);
          }}
        />

        <button
          onClick={() => void handleSend()}
          disabled={isSendDisabled}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 sm:h-10 sm:w-10 ${
            isSendDisabled
              ? 'bg-[#1e293b] opacity-50 cursor-not-allowed'
              : 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:scale-105 hover:brightness-110 cursor-pointer shadow-[0_4px_12px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_16px_rgba(6,182,212,0.4)]'
          }`}
          aria-label="Send message"
        >
          <svg className="ml-0.5 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex justify-center items-center mt-2.5 opacity-60 hover:opacity-100 transition-opacity">
        <div className="text-[10px] text-slate-400 bg-black/20 px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              voiceStatus === 'processing'
                ? 'bg-amber-400 animate-pulse'
                : isListening
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-slate-500'
            }`}
          />
          {voiceStatus === 'processing'
            ? 'Processing...'
            : isListening
              ? 'Listening...'
              : buddyLanguage === 'hinglish'
                ? 'Buddy AI Assistant Active (Hinglish)'
                : 'Buddy AI Assistant Active'}
        </div>
      </div>
    </div>
  );
}
