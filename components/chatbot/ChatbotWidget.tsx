'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useChatbot } from '@/context/ChatbotContext';
import ChatbotHeader from './ChatbotHeader';
import ChatbotMessages from './ChatbotMessages';
import SuggestedQuestions from './SuggestedQuestions';
import ChatbotInput from './ChatbotInput';

export default function ChatbotWidget() {
  const { isOpen, setIsOpen, isBuddyVisible, setIsBuddyVisible } = useChatbot();
  const constraintsRef = React.useRef(null);
  const [isMounted, setIsMounted] = React.useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      setIsMobileCollapsed(false);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  if (!isBuddyVisible) return null;

  return (
    <>
      {/* Draggable boundary constraint for the widget */}
      <div className="fixed inset-0 pointer-events-none z-[40]" ref={constraintsRef} />

      {/* TRIGGER BUTTON (when closed) */}
      {!isOpen && (
        <motion.div
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
          onClick={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          className="fixed z-[99] bottom-4 right-3 flex h-20 w-20 items-center justify-center transition-all duration-200 cursor-grab group sm:bottom-5 sm:right-5 sm:h-24 sm:w-24 md:bottom-8 md:right-8 md:h-[104px] md:w-[104px]"
          aria-label="Open Buddy AI Assistant chatbot"
        >
          <div className="relative w-full h-full flex items-center justify-center isolate">
            {/* Quick Hide Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBuddyVisible(false);
              }}
              aria-label="Hide Buddy AI"
              className="absolute -top-2 -right-2 z-30 p-1 flex items-center justify-center text-white/50 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 md:flex hidden hover:scale-110 drop-shadow-md"
              title="Hide Buddy AI"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Mobile Quick Hide - always visible on mobile if needed, or just keep group hover for now. 
                Actually, for mobile, it's better to have it always visible if small. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBuddyVisible(false);
              }}
              aria-label="Hide Buddy AI"
              className="absolute -top-2 -right-2 z-30 p-1 flex items-center justify-center text-white/60 hover:text-red-400 md:hidden active:scale-90 drop-shadow-md"
            >
              <X className="h-5 w-5" />
            </button>

            {/* The image is now natively transparent via Node.js processing */}
            <Image
              src="/yk_mascot.png" 
              alt="Buddy AI Assistant Mascot" 
              fill
              sizes="128px"
              className="w-full h-full object-contain object-center scale-[1.3] group-hover:-translate-y-1 group-hover:rotate-3 transition-all duration-300 z-0 drop-shadow-[0_10px_20px_rgba(6,182,212,0.6)]" 
            />
          </div>
        </motion.div>
      )}

      {/* CHAT WINDOW (when open) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop Overlay - only visible on < 768px in responsive flow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99] cursor-pointer bg-black/50 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: '20px', scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: '20px', scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`fixed bottom-0 left-0 right-0 z-[100] border border-white/10 bg-[#020817]/85 backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden rounded-t-2xl md:left-auto md:bottom-24 md:right-6 md:h-[min(700px,80vh)] md:w-[380px] lg:w-[420px] md:rounded-2xl ${
                isMobileCollapsed ? 'h-[140px]' : 'h-[min(85vh,100dvh-2rem)]'
              }`}
              role="dialog"
              aria-modal="true"
            >
              <div className="w-full bg-[#1e293b] px-3 pb-1 pt-2 md:hidden">
                <div className="mb-2 flex justify-center">
                  <div className="h-1 w-10 rounded-full bg-[#334155]" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileCollapsed((prev) => !prev)}
                  className="mx-auto flex items-center gap-1 rounded-full border border-white/10 bg-[#0f172a] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300"
                  aria-label={isMobileCollapsed ? 'Expand chat window' : 'Collapse chat window'}
                >
                  {isMobileCollapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isMobileCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>

              <ChatbotHeader />
              {!isMobileCollapsed && (
                <>
                  <ChatbotMessages />
                  <SuggestedQuestions />
                </>
              )}
              <ChatbotInput />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
