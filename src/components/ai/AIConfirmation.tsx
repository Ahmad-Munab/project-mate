/**
 * AI Confirmation Component
 * This component renders a confirmation dialog for AI actions
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X, Trash, AlertTriangle } from "lucide-react";
import { PendingAction } from "./types";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AIConfirmationProps {
  pendingAction: PendingAction;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isProcessing?: boolean;
}

// Use memo to prevent unnecessary re-renders
export const AIConfirmation = memo(function AIConfirmation({
  pendingAction,
  onConfirm,
  onCancel,
  isProcessing = false
}: AIConfirmationProps) {
  const isDestructive = pendingAction.type?.includes("delete");

  return (
    <motion.div
      className="p-1.5 sm:p-2 border-t bg-white dark:bg-background"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center mb-2.5">
        {isDestructive ? (
          <div className="relative mr-1.5">
            <div className="absolute -inset-0.5 rounded-full bg-red-300 opacity-75 blur-[1px] animate-pulse"></div>
            <div className="relative">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            </div>
          </div>
        ) : (
          <div className="relative mr-1.5">
            <div className="absolute -inset-0.5 rounded-full bg-green-200/70 opacity-75 blur-[1px] animate-pulse"></div>
            <div className="relative">
              <AlertCircle className="h-3.5 w-3.5 text-green-500" />
            </div>
          </div>
        )}
        <h3 className={cn(
          "text-xs font-medium",
          isDestructive ? "text-red-600" : "text-green-600 dark:text-green-400"
        )}>
          {isDestructive ? "Confirm Deletion" : "Confirm Action"}
        </h3>
      </div>

      <motion.div
        className="flex gap-2 mt-3"
        initial={{ scale: 0.95, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex-1 h-9 text-xs border-border/50 transition-all duration-200",
            "hover:shadow-sm",
            isProcessing && "opacity-50"
          )}
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
        <Button
          variant={isDestructive ? "destructive" : "outline"}
          size="sm"
          className={cn(
            "flex-1 h-9 text-xs transition-all duration-200",
            isDestructive ? "" : "shadow-sm hover:shadow bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700",
            isProcessing && "opacity-80"
          )}
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              {isDestructive ? (
                <Trash className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isDestructive ? "Delete" : "Confirm"}
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
});
