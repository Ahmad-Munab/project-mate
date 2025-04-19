/**
 * AI Input Component
 * This component renders the input field for the AI chat
 */

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { PlusCircle, Send, Loader2, Wand2 } from "lucide-react";
import { Project } from "./types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AIInputProps {
  input: string;
  setInput: (input: string) => void;
  isTyping: boolean;
  onSendMessage: (e?: React.FormEvent) => Promise<void>;
  onCreateTask: () => Promise<void>;
  onPerformAction: () => Promise<void>;
  project: Project | null;
  isProcessing?: Record<string, boolean>;
}

// Use memo to prevent unnecessary re-renders
export const AIInput = memo(function AIInput({ 
  input, 
  setInput, 
  isTyping, 
  onSendMessage, 
  onCreateTask, 
  onPerformAction,
  project,
  isProcessing = {}
}: AIInputProps) {
  const isCreatingTask = isProcessing['createTask'];
  const isPerformingAction = isProcessing['performAction'];
  const isDisabled = !input.trim() || isTyping || !project?.id || isCreatingTask || isPerformingAction;
  
  return (
    <SheetFooter className="sticky bottom-0 p-3 border-t z-10">
      <form onSubmit={onSendMessage} className="flex w-full items-center space-x-2">
        <div className="flex-1 relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Mate anything..."
            className="pr-16 border-muted focus-visible:ring-1 focus-visible:ring-primary/30 rounded-md pl-3 h-9"
            autoComplete="off"
            disabled={isTyping || !project?.id}
          />
          {project?.id && input.trim() && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-sm hover:bg-muted"
                      onClick={onCreateTask}
                      disabled={isCreatingTask}
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Create task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-sm hover:bg-muted"
                      onClick={onPerformAction}
                      disabled={isPerformingAction}
                    >
                      <Wand2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Perform action</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={isDisabled}
          className="rounded-md h-9 px-3 bg-primary hover:bg-primary/90 flex-shrink-0"
        >
          {isTyping ? 
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 
            <>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              <span>Send</span>
            </>
          }
        </Button>
      </form>
    </SheetFooter>
  );
});
