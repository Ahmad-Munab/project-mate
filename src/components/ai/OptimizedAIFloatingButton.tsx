"use client";

/**
 * Optimized AI Floating Button
 * This component renders a floating button that opens the optimized AI assistant
 */

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAssistant } from "./AIAssistant";

interface OptimizedAIFloatingButtonProps {
  projectId?: string;
}

// Use memo to prevent unnecessary re-renders
export const OptimizedAIFloatingButton = memo(function OptimizedAIFloatingButton({
  projectId
}: OptimizedAIFloatingButtonProps) {
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant component */}
      <AIAssistant
        open={isOpen}
        onOpenChange={handleCloseAssistant}
        projectId={projectId}
      />
    </>
  );
});

// Also export as default for easier imports
export default OptimizedAIFloatingButton;
