/**
 * AI Header Component
 * This component renders the header of the AI chat
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, X } from "lucide-react";

interface AIHeaderProps {
  onClose: () => void;
}

// Use memo to prevent unnecessary re-renders
export const AIHeader = memo(function AIHeader({ onClose }: AIHeaderProps) {
  return (
    <SheetHeader className="sticky top-0 p-3 border-b z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-2.5 bg-primary/10 rounded-full p-1.5">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-base font-semibold text-primary">Mate</SheetTitle>
            <p className="text-xs text-muted-foreground">Your AI Project Assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </SheetHeader>
  );
});
