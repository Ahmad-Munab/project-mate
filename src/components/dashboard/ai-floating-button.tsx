"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Sparkles, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import AIAssistant from "./ai-assistant"

type Project = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  readme?: string | null;
};

interface AIFloatingButtonProps {
  project: Project | null;
}

export default function AIFloatingButton({ project }: AIFloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Handle opening the AI assistant
  const handleOpenAssistant = () => {
    setIsOpen(true)
  }

  // Handle closing the AI assistant
  const handleCloseAssistant = (open: boolean) => {
    setIsOpen(open)
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-40"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-purple-600 opacity-75 blur-sm group-hover:opacity-100 transition-opacity animate-pulse"></div>
              <Button
                onClick={handleOpenAssistant}
                size="icon"
                className="relative h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <span className="sr-only">Open AI Assistant</span>
              </Button>
            </div>

            {/* Floating label */}
            <motion.div
              className="absolute -top-10 right-0 bg-background border border-border rounded-full px-3 py-1 shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Ask Mate</span>
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
  )
}
