/**
 * AI Floating Button Component
 * This component renders a floating button that opens the AI assistant
 */

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { AIAssistant } from "./AIAssistant";
import { AIFloatingButtonProps } from "./types";
import { motion, AnimatePresence } from "framer-motion";

// Use memo to prevent unnecessary re-renders
export const AIFloatingButton = memo(function AIFloatingButton({ project }: AIFloatingButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Button
              onClick={() => setOpen(true)}
              size="icon"
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-md"
              aria-label="Open AI Assistant"
            >
              <Bot className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AIAssistant open={open} onOpenChange={setOpen} project={project} />
    </>
  );
});
