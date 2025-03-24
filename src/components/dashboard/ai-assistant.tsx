"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Send, Zap, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AIAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: any
}

export default function AIAssistant({ open, onOpenChange, project }: AIAssistantProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [suggestions, setSuggestions] = useState([
    "Analyze my project timeline",
    "Suggest task breakdown for authentication feature",
    "Identify potential bottlenecks",
    "Generate test cases for API endpoints",
  ])

  useEffect(() => {
    if (open && messages.length === 0) {
      // Initial message
      setIsTyping(true)
      setTimeout(() => {
        setMessages([
          {
            role: "assistant",
            content: `Hello! I'm your AI project assistant. I'm analyzing your project "${project?.name || "current project"}"...`,
            timestamp: new Date(),
          },
        ])
        setIsTyping(false)
      }, 1000)

      // Follow-up message
      setTimeout(() => {
        setIsTyping(true)
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `I've analyzed your project and noticed a few things:
              
1. Based on your team's velocity, I recommend splitting the authentication feature into 3 smaller tasks:
   - Implement OAuth providers
   - Create user session management
   - Add role-based permissions

2. I noticed potential conflicts in the API integration branch. Would you like me to suggest a resolution strategy?

3. I can generate test cases for the new API endpoints based on your documentation. Would you like to review them?`,
              timestamp: new Date(),
            },
          ])
          setIsTyping(false)
        }, 2000)
      }, 2000)
    }
  }, [open, project])

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate AI response
    setIsTyping(true)
    setTimeout(() => {
      let response

      if (input.toLowerCase().includes("test") || input.toLowerCase().includes("cases")) {
        response = {
          role: "assistant",
          content: `I've generated test cases for your API endpoints:

1. **User Authentication Tests**
   - Test valid login credentials
   - Test invalid password
   - Test account lockout after multiple failed attempts
   - Test password reset flow

2. **Product API Tests**
   - Test product creation with valid data
   - Test product update permissions
   - Test product listing with pagination
   - Test product search functionality

Would you like me to expand on any of these test cases?`,
          timestamp: new Date(),
        }
      } else if (input.toLowerCase().includes("conflict") || input.toLowerCase().includes("branch")) {
        response = {
          role: "assistant",
          content: `I've analyzed the conflicts in the API integration branch. Here's my suggested resolution strategy:

1. The conflicts are primarily in the \`/src/api/endpoints.js\` file where both branches modified the authentication middleware.

2. I recommend keeping the changes from the feature branch for the middleware structure, but incorporating the security improvements from the main branch.

3. For the database schema changes, you should merge both sets of changes as they affect different tables.

Would you like me to generate the merged code for you to review?`,
          timestamp: new Date(),
        }
      } else {
        response = {
          role: "assistant",
          content: `I'll help you with that! Based on your project context, here are some recommendations:

1. Your current sprint is 65% complete with 8 days remaining.

2. The critical path includes completing the authentication system before the payment integration can begin.

3. I've identified that David's tasks have dependencies from 3 other team members, which might create a bottleneck.

Would you like me to suggest a task reallocation to optimize the workflow?`,
          timestamp: new Date(),
        }
      }

      setMessages((prev) => [...prev, response])
      setIsTyping(false)
    }, 2000)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSendMessage()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col h-full">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 text-primary mr-2" />
              <SheetTitle>AI Project Assistant</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex ${message.role === "user" ? "flex-row-reverse" : "flex-row"} max-w-[80%] gap-2`}
                  >
                    <Avatar className={`h-8 w-8 ${message.role === "user" ? "ml-2" : "mr-2"}`}>
                      {message.role === "assistant" ? (
                        <>
                          <AvatarImage src="/placeholder.svg?height=32&width=32" />
                          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                        </>
                      ) : (
                        <>
                          <AvatarImage src="/placeholder.svg?height=32&width=32" />
                          <AvatarFallback>U</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div>
                      <Card
                        className={`${
                          message.role === "assistant"
                            ? "bg-muted border-muted"
                            : "bg-primary text-primary-foreground border-primary"
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="whitespace-pre-line text-sm">{message.content}</div>
                        </CardContent>
                      </Card>
                      <div
                        className={`text-xs text-muted-foreground mt-1 ${message.role === "user" ? "text-right" : ""}`}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex flex-row max-w-[80%] gap-2">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src="/placeholder.svg?height=32&width=32" />
                      <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                    </Avatar>
                    <Card className="bg-muted border-muted">
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
                          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {messages.length > 0 && !isTyping && (
          <div className="p-4 border-t">
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Suggested prompts:</h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Zap className="h-3 w-3 mr-1 text-primary" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your AI assistant..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

