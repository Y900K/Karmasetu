'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useChatbot, Message } from '@/context/ChatbotContext';
import { useLanguage } from '@/context/LanguageContext';
import TextToSpeech from './TextToSpeech';
import { cleanResponse } from '@/utils/cleanResponse';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { language } = useLanguage();
  const { buddyLanguage } = useChatbot();
  const displayText = cleanResponse(message.content);

  const isUser = message.role === 'user';
  const isError = message.isError;
  const shouldAutoPlayVoice = !isUser && !isError && Boolean(message.autoPlayTts);

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 250, damping: 25 }}
        className="mb-3 flex justify-end sm:mb-4"
      >
        <div className="flex max-w-[88%] flex-col items-end sm:max-w-[80%]">
          <div className="w-full break-words whitespace-pre-line rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px] border border-white/10 bg-gradient-to-br from-cyan-500 to-blue-600 px-3 py-2.5 text-[13px] leading-relaxed text-white shadow-[0_4px_16px_rgba(6,182,212,0.3)] sm:px-4 sm:py-3 sm:text-[14px]">
            {displayText}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 mr-1">{formatTime(message.timestamp)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 250, damping: 25 }}
      className="mb-3 flex justify-start gap-2.5 sm:mb-4 sm:gap-3"
    >
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-cyan-500 to-blue-500 shadow-[0_2px_8px_rgba(6,182,212,0.3)] sm:h-7 sm:w-7">
        <span className="text-[9px] font-black tracking-wide text-white">AI</span>
      </div>

      <div className="flex max-w-[90%] flex-col sm:max-w-[85%]">
        <div
          className={`break-words whitespace-pre-line rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px] px-3 py-2.5 text-[13px] leading-relaxed shadow-sm sm:px-4 sm:py-3 sm:text-[14px] ${
            isError
              ? 'bg-red-500/15 backdrop-blur-lg border border-red-500/30 text-red-200'
              : 'bg-[#1e293b]/70 backdrop-blur-xl border border-white/5 text-slate-100'
          }`}
        >
          {isError && <span className="mr-1 font-semibold">Warning:</span>}
          {displayText}

          {!isError && (
            <div className="bg-amber-500/[0.08] border border-amber-500/[0.15] rounded-lg px-2 py-1 mt-2 flex items-start gap-1 text-[8px] text-amber-500/70">
              <span className="text-amber-400 text-[7px] shrink-0 mt-[2px] font-semibold">Note</span>
              <span className="leading-tight">
                {language === 'HINGLISH' ? (
                  <>AI galti kar sakta hai. Safety Officer se confirm kar lo.</>
                ) : (
                  <>AI can make mistakes. Consult your Safety Officer.</>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 ml-1">
          <span className="text-[10px] text-slate-500">{formatTime(message.timestamp)}</span>
          {!isError && (
            <TextToSpeech
              text={displayText}
              language={buddyLanguage === 'hinglish' ? 'HINGLISH' : 'EN'}
              messageId={message.id}
              autoPlay={shouldAutoPlayVoice}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
