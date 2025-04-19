/**
 * AI Typing Indicator Component
 * This component shows a typing indicator when the AI is generating a response
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

// Use memo to prevent unnecessary re-renders
export const AITypingIndicator = memo(function AITypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 500, damping: 25 }}
      className="flex justify-start mb-4 w-full px-1"
    >
      <div className="flex flex-row gap-4 items-start max-w-[95%]">
        {/* Avatar */}
        <div className="mr-3 flex-shrink-0 mt-0.5">
          <div className="relative h-8 w-8 flex items-center justify-center">
            <div className="absolute -inset-0.5 rounded-full bg-green-200/70 opacity-75 blur-[1px] animate-pulse"></div>
            <div className="relative bg-white dark:bg-background rounded-full p-1.5 shadow-sm h-8 w-8 flex items-center justify-center">
              <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Typing indicator */}
        <div className="min-w-0 max-w-[85%] sm:max-w-[80%] md:max-w-[75%] overflow-hidden">
          <div className={cn(
            "rounded-lg px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm overflow-hidden",
            "bg-white border border-border/50 dark:bg-background dark:border-border/30"
          )}>
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500/60"
                animate={{ scale: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500/60"
                animate={{ scale: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500/60"
                animate={{ scale: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-[10px] text-muted-foreground mt-1">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
});
