/**
 * AI Message Component
 * This component renders a single message in the AI chat
 */

import { memo } from "react";
import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { AIMessage } from "@/store/aiStore";

interface AIMessageProps {
  message: AIMessage;
}

// Use memo to prevent unnecessary re-renders
export const AIMessage = memo(function AIMessage({ message }: AIMessageProps) {
  const isUser = message.role === "user";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} max-w-[85%] gap-2 items-start`}
      >
        {/* Avatar */}
        <div className={`${isUser ? "ml-2" : "mr-2"} mt-1 flex-shrink-0`}>
          {!isUser ? (
            <div className="bg-primary/10 rounded-full p-1.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
          ) : (
            <div className="bg-background rounded-full p-1.5 border border-border">
              <User className="h-4 w-4 text-foreground" />
            </div>
          )}
        </div>
        
        {/* Message content */}
        <div className="flex-1 min-w-0">
          <div
            className={`rounded-lg px-3 py-2 ${!isUser
              ? "bg-muted border border-border"
              : "bg-primary text-primary-foreground"}`}
          >
            <div className="whitespace-pre-line text-sm">{message.content}</div>
          </div>
          
          {/* Timestamp */}
          <div
            className={`text-[10px] text-muted-foreground mt-0.5 ${isUser ? "text-right" : ""}`}
          >
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
