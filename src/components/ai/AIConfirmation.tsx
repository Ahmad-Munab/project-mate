/**
 * AI Confirmation Component
 * This component renders a confirmation dialog for AI actions
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";
import { PendingAction } from "./types";

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
  return (
    <div className="p-3 border-t">
      <div className="flex items-center mb-2">
        <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
        <h3 className="text-xs font-medium">Confirm Action</h3>
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-muted hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Confirm
            </>
          )}
        </Button>
      </div>
    </div>
  );
});
