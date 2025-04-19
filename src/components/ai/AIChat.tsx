/**
 * AI Chat Component
 * This component renders the chat messages and typing indicator
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { RefObject } from "react";
import { AIMessage } from "@/store/aiStore";
import { AIMessage as AIMessageComponent } from "./AIMessage";
import { AITypingIndicator } from "./AITypingIndicator";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface AIChatProps {
  messages: AIMessage[];
  isTyping: boolean;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
}

export function AIChat({ messages, isTyping, scrollAreaRef }: AIChatProps) {
  return (
    <ScrollArea
      className={cn(
        "flex-1 px-1.5 sm:px-2 md:px-3 py-2 sm:py-3 overflow-y-auto",
        "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        "bg-white dark:bg-background"
      )}
      ref={scrollAreaRef}
    >
      <div className="space-y-4 pb-2 w-full max-w-full overflow-hidden">
        <AnimatePresence>
          {messages.length === 0 && !isTyping && (
            <motion.div
              className="flex flex-col items-center justify-center h-full min-h-[180px] sm:min-h-[200px] text-center p-4 sm:p-6 mt-6 sm:mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative mb-4">
                <div className="absolute -inset-1 rounded-full bg-green-200/70 opacity-75 blur-[2px] animate-pulse"></div>
                <div className="relative bg-white dark:bg-background rounded-full p-3 shadow-sm">
                  <Sparkles className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="max-w-[90%] sm:max-w-xs">
                <h3 className="text-sm sm:text-base font-medium mb-1 sm:mb-2">How can I help you today?</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">Ask me anything about your project, create tasks, or get assistance with your work.</p>
              </div>
            </motion.div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index === messages.length - 1 ? 0.1 : 0 }}
            >
              <AIMessageComponent message={message} />
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AITypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
