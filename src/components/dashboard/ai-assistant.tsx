"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Send, Zap, Loader2, PlusCircle, Bot, User, ChevronDown, ChevronUp, Lightbulb, Brain, Code, Database, Wand2, ListTodo, Calendar, ArrowRight } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useAIStore } from "@/store/aiStore"
import { createTaskViaAI, performAIAction } from "@/actions/ai/actions"

type Project = {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  readme?: string | null;
};

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export default function AIAssistant({ open, onOpenChange, project }: AIAssistantProps) {
  const [input, setInput] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { messages: storedMessages, isTyping, setIsTyping, addMessage } = useAIStore()
  const projectMessages = project?.id ? (storedMessages[project.id] || []) : []

  // Dynamic suggestions based on project context
  const [suggestions, setSuggestions] = useState([
    "Create 3 tasks for implementing user authentication",
    "Move all in-progress tasks to done",
    "Create a new column for code review",
    "What tasks are currently in the backlog?",
    "Set due dates for all high priority tasks",
    "Suggest a project structure for this app",
  ])

  // Update suggestions based on project context
  useEffect(() => {
    if (project?.id && open) {
      // Get project-specific suggestions
      performAIAction(project.id, "Generate 6 short, specific suggestions for prompts that would be helpful for this project. Each suggestion should be a single sentence and focus on technical aspects. Return ONLY the list of suggestions separated by '|' characters with no additional text.")
        .then(result => {
          if (result.success && result.message) {
            // Parse the suggestions
            const newSuggestions = result.message
              .split('|')
              .map(s => s.trim())
              .filter(s => s.length > 0)

            // Update suggestions if we got valid ones
            if (newSuggestions.length >= 3) {
              setSuggestions(newSuggestions.slice(0, 6))
            }
          }
        })
        .catch(error => {
          console.error("Error getting suggestions:", error)
        })
    }
  }, [project?.id, open])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        // Use setTimeout to ensure the DOM has updated
        setTimeout(() => {
          scrollArea.scrollTop = scrollArea.scrollHeight
        }, 0)
      }
    }
  }, [projectMessages, isTyping])

  // Initialize with welcome message if no messages exist
  useEffect(() => {
    if (open && project?.id && projectMessages.length === 0) {
      // Initial welcome message
      setIsTyping(true)

      // Simulate typing delay
      setTimeout(async () => {
        try {
          // Call server action to get a personalized welcome message
          const result = await performAIAction(project.id, "Introduce yourself as Mate, the AI project assistant, and provide a brief overview of what you can do to help with this specific project. Be concise but informative.")

          if (result.error) {
            // Fallback message if there's an error
            addMessage(project.id, {
              role: "assistant",
              content: `Hello! I'm Mate, your AI project assistant. I'm here to help with your project "${project?.name || "current project"}".

I can help you with:
- Creating technical tasks
- Suggesting implementation approaches
- Providing code guidance
- Planning project architecture
- Answering development questions

How can I assist you today?`,
              timestamp: new Date(),
            })
          } else {
            // Use the AI-generated welcome message
            addMessage(project.id, {
              role: "assistant",
              content: result.message,
              timestamp: new Date(),
            })
          }
        } catch (error) {
          // Fallback message if there's an error
          addMessage(project.id, {
            role: "assistant",
            content: `Hello! I'm Mate, your AI project assistant. I'm here to help with your project "${project?.name || "current project"}".

I can help you with:
- Creating technical tasks
- Suggesting implementation approaches
- Providing code guidance
- Planning project architecture
- Answering development questions

How can I assist you today?`,
            timestamp: new Date(),
          })
          console.error("Error getting welcome message:", error)
        } finally {
          setIsTyping(false)
        }
      }, 1000)
    }
  }, [open, project, projectMessages.length, addMessage, setIsTyping])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || !project?.id) return

    // Store the current input before clearing it
    const currentInput = input

    // Add user message
    const userMessage = {
      role: "user" as const,
      content: currentInput,
      timestamp: new Date(),
    }

    // Add to local state
    addMessage(project.id, userMessage)

    // Clear input immediately to improve UX
    setInput("")

    // Show typing indicator
    setIsTyping(true)

    // Check if this is a task creation request
    const isTaskCreationRequest = (
      currentInput.toLowerCase().includes("create task") ||
      currentInput.toLowerCase().includes("add task") ||
      currentInput.toLowerCase().includes("new task") ||
      currentInput.toLowerCase().includes("create a task") ||
      currentInput.toLowerCase().includes("make a task") ||
      (currentInput.toLowerCase().includes("create") && currentInput.toLowerCase().includes("tasks"))
    )

    try {
      if (isTaskCreationRequest) {
        // Handle task creation directly
        await handleCreateMultipleTasks(currentInput)
      } else {
        // Regular chat message
        // Send message to API
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: currentInput,
            projectId: project.id,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to get AI response")
        }

        const data = await response.json()

        // Add AI response to state
        addMessage(project.id, {
          role: "assistant",
          content: data.message,
          timestamp: new Date(data.timestamp),
        })
      }
    } catch (error) {
      console.error("Error getting AI response:", error)
      toast.error("Failed to get AI response. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      })
    } finally {
      setIsTyping(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSendMessage()
  }

  const handleCreateTask = async () => {
    if (!project?.id || !input.trim()) return

    try {
      // Show loading state
      toast.loading("Creating task...")

      // Call server action to create task
      const result = await createTaskViaAI(project.id, input)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Task created successfully!")

      // Add AI response to state
      addMessage(project.id, {
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      })

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error creating task:", error)
      toast.error("Failed to create task. Please try again.")
    }
  }

  const handleCreateMultipleTasks = async (taskDescription: string) => {
    if (!project?.id) return

    try {
      // Check if the request is for multiple tasks
      const isMultipleTasks = (
        taskDescription.toLowerCase().includes("tasks") ||
        taskDescription.toLowerCase().includes("multiple") ||
        taskDescription.match(/\d+\s+tasks/) // e.g., "3 tasks"
      )

      if (isMultipleTasks) {
        // Extract number of tasks if specified
        const numTasksMatch = taskDescription.match(/(\d+)\s+tasks?/)
        const numTasks = numTasksMatch ? parseInt(numTasksMatch[1]) : 3 // Default to 3 if not specified

        // Show loading state
        toast.loading(`Creating ${numTasks} tasks...`)

        // Add AI thinking message
        addMessage(project.id, {
          role: "assistant",
          content: `I'm creating ${numTasks} tasks based on your request. Please wait...`,
          timestamp: new Date(),
        })

        // Create tasks one by one
        let tasksCreated = []
        let errorOccurred = false

        for (let i = 0; i < numTasks; i++) {
          try {
            // Create task with index for context
            const result = await createTaskViaAI(project.id,
              `This is task ${i+1} of ${numTasks} for: ${taskDescription}. Make this task specific and detailed.`
            )

            if (result.error) {
              errorOccurred = true
              continue
            }

            tasksCreated.push(result.task)
          } catch (error) {
            console.error(`Error creating task ${i+1}:`, error)
            errorOccurred = true
          }
        }

        // Show results
        if (tasksCreated.length > 0) {
          // Success message
          toast.success(`Created ${tasksCreated.length} tasks successfully!`)

          // Add AI response with task details
          const taskListMessage = `I've created ${tasksCreated.length} tasks for you:\n\n` +
            tasksCreated.map((task, index) =>
              `**Task ${index+1}: ${task.title}**\n` +
              `* Status: ${task.status}\n` +
              `* Priority: ${task.priority}\n` +
              `* Description: ${task.description}\n`
            ).join('\n')

          addMessage(project.id, {
            role: "assistant",
            content: taskListMessage,
            timestamp: new Date(),
          })
        }

        if (errorOccurred) {
          toast.error("Some tasks could not be created. Please try again.")
        }
      } else {
        // Single task creation
        const result = await createTaskViaAI(project.id, taskDescription)

        if (result.error) {
          toast.error(result.error)
          return
        }

        // Success message
        toast.success("Task created successfully!")

        // Add AI response to state
        addMessage(project.id, {
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
        })
      }
    } catch (error) {
      console.error("Error creating tasks:", error)
      toast.error("Failed to create tasks. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error creating the tasks. Please try again.",
        timestamp: new Date(),
      })
    }
  }

  const handlePerformAction = async () => {
    if (!project?.id || !input.trim()) return

    try {
      // Show loading state
      toast.loading("Performing action...")

      // Call server action to perform AI action
      const result = await performAIAction(project.id, input)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Action completed successfully!")

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error performing action:", error)
      toast.error("Failed to perform action. Please try again.")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 flex flex-col h-full border-l border-border/50 backdrop-blur-sm overflow-hidden">
        <SheetHeader className="sticky top-0 p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="relative mr-3">
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary to-purple-600 opacity-75 blur-sm animate-pulse"></div>
                <div className="relative bg-background rounded-full p-1.5">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <SheetTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">Mate</SheetTitle>
                <p className="text-xs text-muted-foreground">Your AI Project Assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-6 bg-gradient-to-b from-background to-muted/30 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-6">
            <AnimatePresence>
              {projectMessages.map((message, index) => (
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
                    <div className={`${message.role === "user" ? "ml-2" : "mr-2"}`}>
                      {message.role === "assistant" ? (
                        <div className="relative">
                          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary to-purple-600 opacity-75 blur-sm"></div>
                          <div className="relative bg-background rounded-full p-1.5">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      ) : (
                        <div className="bg-background rounded-full p-1.5 border border-border">
                          <User className="h-5 w-5 text-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div
                        className={`rounded-2xl px-4 py-3 ${message.role === "assistant"
                          ? "bg-gradient-to-br from-muted/80 to-muted border border-border shadow-sm"
                          : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md"}`}
                      >
                        <div className="whitespace-pre-line text-sm leading-relaxed">{message.content}</div>
                      </div>
                      <div
                        className={`text-xs text-muted-foreground mt-1 ${message.role === "user" ? "text-right" : ""}`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                    <div className="mr-2 relative">
                      <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-primary to-purple-600 opacity-75 blur-sm animate-pulse"></div>
                      <div className="relative bg-background rounded-full p-1.5">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="rounded-2xl px-4 py-3 bg-gradient-to-br from-muted/80 to-muted border border-border shadow-sm">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-purple-600 animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-purple-600 animate-bounce [animation-delay:0.2s]" />
                        <div className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-purple-600 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {projectMessages.length > 0 && !isTyping && (
          <div className="p-4 border-t bg-gradient-to-b from-muted/30 to-background">
            <div className="mb-4">
              <div className="flex items-center mb-3">
                <Lightbulb className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-sm font-medium">Suggested prompts</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.map((suggestion, index) => {
                  const icons = [ListTodo, ArrowRight, Database, Calendar, Wand2, Brain];
                  const Icon = icons[index % icons.length];
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs justify-start h-auto py-2 px-3 hover:bg-primary/5 hover:text-primary transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <Icon className="h-3 w-3 mr-2 text-primary flex-shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="sticky bottom-0 p-4 border-t bg-gradient-to-b from-background to-muted/10 z-10">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Mate anything..."
                  className="flex-1 pr-10 bg-background/80 backdrop-blur-sm border-muted-foreground/20 focus-visible:ring-primary/50 rounded-full pl-4"
                  autoComplete="off"
                />
                {project?.id && input.trim() && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:bg-primary/10"
                      onClick={handleCreateTask}
                      title="Create task from this message"
                    >
                      <PlusCircle className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full hover:bg-primary/10"
                      onClick={handlePerformAction}
                      title="Let AI perform this action"
                    >
                      <Wand2 className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isTyping || !project?.id}
              className="rounded-full h-10 w-10 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity shadow-md flex-shrink-0"
            >
              {isTyping ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
