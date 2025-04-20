/**
 * AI Header Component
 * This component renders the header of the AI chat
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, X, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface AIHeaderProps {
  onClose: () => void;
}

// Use memo to prevent unnecessary re-renders
export const AIHeader = memo(function AIHeader({ onClose }: AIHeaderProps) {
  return (
    <SheetHeader className="sticky top-0 px-2 sm:px-3 py-1.5 sm:py-2 border-b z-10 bg-white dark:bg-background">
      <div className="flex items-center justify-between">
        <motion.div
          className="flex items-center"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative mr-2.5">
            <div className="absolute -inset-0.5 rounded-full bg-green-200/70 opacity-75 blur-[1px] animate-pulse"></div>
            <div className="relative bg-white dark:bg-background rounded-full p-1.5 shadow-sm">
              <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <SheetTitle className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">Mate</SheetTitle>
              <Sparkles className="h-3.5 w-3.5 text-green-500 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground hidden xs:block">Your AI Project Assistant</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted transition-colors duration-200 relative group"
            onClick={onClose}
          >
            <span className="absolute inset-0 rounded-full bg-muted/0 group-hover:bg-muted/50 transition-colors duration-200"></span>
            <X className="h-4 w-4 relative z-10" />
          </Button>
        </motion.div>
      </div>
    </SheetHeader>
  );
});
