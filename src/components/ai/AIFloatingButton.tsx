/**
 * AI Floating Button Component
 * This component renders a floating button that opens the AI assistant
 */

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAssistant } from "./AIAssistant";
import { AIFloatingButtonProps } from "./types";

// Use memo to prevent unnecessary re-renders
export const AIFloatingButton = memo(function AIFloatingButton({ project }: AIFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle opening the AI assistant
  const handleOpenAssistant = () => {
    setIsOpen(true);
  };

  // Handle closing the AI assistant
  const handleCloseAssistant = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 sm:-inset-1 rounded-full bg-green-500 opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-pulse"></div>
              <Button
                onClick={handleOpenAssistant}
                size="icon"
                className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg bg-green-500 hover:bg-green-600 transition-colors"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-center">
                  <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <span className="sr-only">Open AI Assistant</span>
              </Button>
            </div>

            {/* Floating label */}
            <motion.div
              className="absolute -top-9 sm:-top-10 right-0 bg-background border border-border rounded-full px-2 sm:px-3 py-1 shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1 sm:gap-1.5">
                <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-[10px] sm:text-xs font-medium">Ask Mate</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant component */}
      <AIAssistant
        open={isOpen}
        onOpenChange={handleCloseAssistant}
        project={project}
      />
    </>
  );
});

// Also export as default for easier imports
export default AIFloatingButton;
