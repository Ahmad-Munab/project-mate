/**
 * AI Typing Indicator Component
 * This component shows a typing indicator when the AI is generating a response
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

// Use memo to prevent unnecessary re-renders
export const AITypingIndicator = memo(function AITypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start mb-3"
    >
      <div className="flex flex-row max-w-[85%] gap-2 items-start">
        {/* Avatar */}
        <div className="mr-2 mt-1 flex-shrink-0">
          <div className="bg-primary/10 rounded-full p-1.5">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        </div>
        
        {/* Typing indicator */}
        <div className="rounded-lg px-3 py-2 bg-muted border border-border">
          <div className="flex items-center space-x-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:0.2s]" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:0.4s]" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});
