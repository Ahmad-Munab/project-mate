/**
 * AI Chat Component
 * This component renders the chat messages and typing indicator
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence } from "framer-motion";
import { RefObject } from "react";
import { AIMessage } from "@/store/aiStore";
import { AIMessage as AIMessageComponent } from "./AIMessage";
import { AITypingIndicator } from "./AITypingIndicator";

interface AIChatProps {
  messages: AIMessage[];
  isTyping: boolean;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
}

export function AIChat({ messages, isTyping, scrollAreaRef }: AIChatProps) {
  return (
    <ScrollArea 
      className="flex-1 px-4 py-4 overflow-y-auto" 
      ref={scrollAreaRef}
    >
      <div className="space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full py-8">
            <p className="text-sm text-muted-foreground">No messages yet. Start a conversation!</p>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message, index) => (
            <AIMessageComponent key={message.id || index} message={message} />
          ))}

          {isTyping && <AITypingIndicator />}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
