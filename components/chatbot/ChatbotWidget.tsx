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
import { usePathname } from 'next/navigation';

export default function ChatbotWidget() {
  const pathname = usePathname();
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

  // Reduced clutter: hide the floating orb on pages that already have native AI integration
  const isExcludedPage = pathname?.includes('/practice-quiz');
  
  if (!isBuddyVisible || isExcludedPage) return null;

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
          whileHover={{ scale: 1.05, cursor: 'grab' }}
          whileTap={{ scale: 0.95, cursor: 'grabbing' }}
          onClick={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          className="fixed z-[100] bottom-20 right-4 flex h-24 w-24 items-center justify-center transition-shadow duration-500 cursor-grab group sm:bottom-6 sm:right-6 sm:h-28 sm:w-28 md:bottom-8 md:right-8 md:h-32 md:w-32"
          aria-label="Open Buddy AI Assistant chatbot"
        >
          <div className="relative w-full h-full flex items-center justify-center isolate">
            {/* Dynamic Glow Layers */}
            <div className="absolute inset-0 z-[-1] scale-110 opacity-60 group-hover:opacity-100 transition-opacity duration-700">
               <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
               <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-700" />
            </div>

            {/* Quick Hide Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBuddyVisible(false);
              }}
              aria-label="Hide Buddy AI"
              className="absolute -top-1 -right-1 z-30 p-1.5 flex items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 text-white/50 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 md:flex hidden hover:scale-110 shadow-lg"
              title="Hide Buddy AI"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsBuddyVisible(false);
              }}
              aria-label="Hide Buddy AI"
              className="absolute -top-1 -right-1 z-30 p-1.5 flex items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-full border border-white/10 text-white/60 hover:text-red-400 md:hidden active:scale-90 shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
 
            {/* Mascot Image with Float Animation */}
            <motion.div
              animate={{
                y: [0, -8, 0],
                rotate: [0, 2, 0, -2, 0]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative w-full h-full overflow-visible"
            >
              <Image
                src="/yk_mascot.png" 
                alt="Buddy AI Assistant Mascot" 
                fill
                sizes="150px"
                className="w-full h-full object-contain object-center scale-[1.35] group-hover:scale-[1.4] transition-transform duration-500 z-0 drop-shadow-[0_15px_30px_rgba(6,182,212,0.7)]" 
              />
            </motion.div>
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
              className="fixed inset-0 z-[101] cursor-pointer bg-black/50 md:hidden"
              onClick={() => setIsOpen(false)}
            />
 
            <motion.div
              initial={{ opacity: 0, y: '20px', scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: '20px', scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`fixed bottom-0 left-0 right-0 z-[102] border border-white/10 bg-[#020817]/85 backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.5),0_0_15px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden rounded-t-2xl md:left-auto md:bottom-24 md:right-6 md:h-[min(700px,80vh)] md:w-[380px] lg:w-[420px] md:rounded-2xl ${
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
