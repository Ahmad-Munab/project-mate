"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Loader2, PlusCircle, Bot, User, Lightbulb, Brain, Database, Wand2, ListTodo, Calendar, ArrowRight } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// UI components
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { useAIStore } from "@/store/aiStore"
import { createTaskViaAI, performAIAction, createColumnViaAI } from "@/actions/ai/actions"



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
  // Define a type for the pending action
  type PendingAction = {
    type: string;
    parameters: {
      description?: string;
      taskDescription?: string;
      taskId?: string;
      columnId?: string;
      columnName?: string;
      addSolutions?: boolean;
      [key: string]: string | boolean | number | undefined; // Allow other properties
    };
    needsConfirmation?: boolean;
  }

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { messages: storedMessages, isTyping, setIsTyping, addMessage } = useAIStore()
  const projectMessages = useMemo(() => {
    return project?.id ? (storedMessages[project.id] || []) : []
  }, [project?.id, storedMessages])

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
          if ('success' in result && result.success && 'message' in result && result.message) {
            // Parse the suggestions
            const newSuggestions = result.message
              .split('|')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)

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

          if ('error' in result && result.error) {
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

    // Check for direct request to add solutions to tasks
    if (currentInput.toLowerCase().includes("edit tasks to provide solution") ||
        currentInput.toLowerCase().includes("add solution") ||
        currentInput.toLowerCase().includes("update tasks with solution")) {
      await handleAddSolutionsToTasks()
      return
    }

    // Show typing indicator
    setIsTyping(true)

    // Check if we have a pending action that needs confirmation
    if (pendingAction) {
      // Check if the user confirmed or denied the action
      const isConfirmed = (
        currentInput.toLowerCase().includes("yes") ||
        currentInput.toLowerCase().includes("confirm") ||
        currentInput.toLowerCase().includes("proceed") ||
        currentInput.toLowerCase().includes("ok") ||
        currentInput.toLowerCase().includes("sure") ||
        currentInput.toLowerCase() === "y"
      )

      const isDenied = (
        currentInput.toLowerCase().includes("no") ||
        currentInput.toLowerCase().includes("cancel") ||
        currentInput.toLowerCase().includes("don't") ||
        currentInput.toLowerCase().includes("dont") ||
        currentInput.toLowerCase().includes("stop") ||
        currentInput.toLowerCase() === "n"
      )

      if (isConfirmed || isDenied) {
        if (isConfirmed) {
          // User confirmed the action, execute it
          try {
            // Handle different action types
            switch (pendingAction.type) {
              case "CREATE_TASK":
                // Handle task creation
                await handleCreateMultipleTasks(pendingAction.parameters.description || "")
                break

              case "CREATE_COLUMN":
              case "MOVE_TASK":
              case "UPDATE_TASK":
                // Handle other actions
                await handlePerformAction(JSON.stringify(pendingAction.parameters))
                break

              case "DELETE_TASK":
                // Handle task deletion
                if (pendingAction.parameters.taskDescription?.toLowerCase().includes("useless")) {
                  // Show loading state
                  toast.loading("Deleting useless tasks...")

                  // Delete useless tasks
                  const result = await performAIAction(project.id, "Delete useless tasks")

                  // Dismiss loading state
                  toast.dismiss()

                  if (result.error) {
                    toast.error(result.error)
                    return
                  }

                  // Success message
                  toast.success("Useless tasks deleted successfully!")

                  // Add AI response to state with the detailed result
                  addMessage(project.id, {
                    role: "assistant",
                    content: result.message || "I've deleted the useless tasks from your project.",
                    timestamp: new Date(),
                  })
                } else if (pendingAction.parameters.taskDescription && (
                  pendingAction.parameters.taskDescription.includes("related") ||
                  pendingAction.parameters.taskDescription.includes("stuff") ||
                  pendingAction.parameters.taskDescription.includes("things") ||
                  pendingAction.parameters.taskDescription.includes("all") ||
                  pendingAction.parameters.taskDescription.includes("everything")
                )) {
                  // Show loading state
                  toast.loading("Deleting domain-specific tasks...")

                  // Delete domain-specific tasks
                  const result = await performAIAction(project.id, `Delete task: ${pendingAction.parameters.taskDescription}`)

                  // Dismiss loading state
                  toast.dismiss()

                  if (result.error) {
                    toast.error(result.error)
                    return
                  }

                  // Success message
                  toast.success("Tasks deleted successfully!")

                  // Add AI response to state with the detailed result
                  addMessage(project.id, {
                    role: "assistant",
                    content: result.message || `I've deleted the tasks related to "${pendingAction.parameters.taskDescription}".`,
                    timestamp: new Date(),
                  })
                } else {
                  // Delete specific task
                  await handleDeleteTask(pendingAction.parameters.taskId || pendingAction.parameters.taskDescription || "")
                }
                break

              case "DELETE_COLUMN":
                // Handle column deletion
                await handleDeleteColumn(pendingAction.parameters.columnId || pendingAction.parameters.columnName || "")
                break

              default:
                // For other actions, add a response
                addMessage(project.id, {
                  role: "assistant",
                  content: "I'm not sure how to perform that action yet. I'll add this capability soon.",
                  timestamp: new Date(),
                })
                break
            }
          } catch (error) {
            console.error("Error executing confirmed action:", error)
            toast.error("Failed to execute the action. Please try again.")

            // Add error message
            addMessage(project.id, {
              role: "assistant",
              content: "I'm sorry, I encountered an error performing this action. Please try again.",
              timestamp: new Date(),
            })
          }
        } else {
          // User denied the action
          addMessage(project.id, {
            role: "assistant",
            content: "I've cancelled the action as requested.",
            timestamp: new Date(),
          })
        }

        // Clear the pending action
        setPendingAction(null)
        setIsTyping(false)
        return
      }
    }

    try {
      // Analyze the message to determine if it's a direct action request
      if (currentInput.toLowerCase().includes("create task") ||
          currentInput.toLowerCase().includes("add task")) {
        await handleCreateMultipleTasks(currentInput);
        return;
      } else if (currentInput.toLowerCase().includes("create column") ||
                 currentInput.toLowerCase().includes("add column")) {
        // Extract column name if possible
        const columnNameMatch = currentInput.match(/column[:\s]+([\w\s]+)/i);
        const columnName = columnNameMatch ? columnNameMatch[1].trim() : "New Column";
        await handleCreateColumn(columnName, "blue");
        return;
      } else if (currentInput.toLowerCase().includes("delete task") ||
                 currentInput.toLowerCase().includes("remove task")) {
        // For delete task actions, ask for confirmation
        let confirmationMessage = "";

        // If we're deleting useless tasks
        if (currentInput.toLowerCase().includes("useless")) {
          // First, preview the useless tasks
          const previewResult = await performAIAction(project.id, `Preview delete task: useless`);
          if (previewResult.error) {
            confirmationMessage = "I'll analyze your project and delete tasks that appear to be useless or unnecessary (like test tasks, placeholders, or duplicates). Are you sure you want me to proceed with this cleanup?";
          } else {
            confirmationMessage = previewResult.message || "I'll analyze your project and delete tasks that appear to be useless or unnecessary. Are you sure you want to proceed?";
          }

          // Store the pending action
          setPendingAction({
            type: "DELETE_TASK",
            parameters: { taskDescription: "useless" }
          });
        } else {
          // Extract task description
          const taskDescMatch = currentInput.match(/task[:\s]+([\w\s]+)/i);
          const taskDesc = taskDescMatch ? taskDescMatch[1].trim() : "the specified task";
          confirmationMessage = `I'll delete the task matching "${taskDesc}". Are you sure you want to proceed?`;

          // Store the pending action
          setPendingAction({
            type: "DELETE_TASK",
            parameters: { taskDescription: taskDesc }
          });
        }

        // Add AI response asking for confirmation
        addMessage(project.id, {
          role: "assistant",
          content: confirmationMessage,
          timestamp: new Date(),
        });

        return;
      } else if (currentInput.toLowerCase().includes("delete column") ||
                 currentInput.toLowerCase().includes("remove column")) {
        // Extract column name
        const columnNameMatch = currentInput.match(/column[:\s]+([\w\s]+)/i);
        const columnDesc = columnNameMatch ? columnNameMatch[1].trim() : "the specified column";
        const confirmationMessage = `I'll delete the column matching "${columnDesc}". Any tasks in this column will be moved to the default column. Are you sure you want to proceed?`;

        // Add AI response asking for confirmation
        addMessage(project.id, {
          role: "assistant",
          content: confirmationMessage,
          timestamp: new Date(),
        });

        // Store the pending action
        setPendingAction({
          type: "DELETE_COLUMN",
          parameters: { columnName: columnDesc }
        });

        return;
      } else if (currentInput.toLowerCase().includes("solution") ||
                 currentInput.toLowerCase().includes("edit tasks to provide")) {
        const confirmationMessage = "I'll analyze your tasks and add detailed technical solutions to each one. This will help you understand how to implement each task. Would you like me to proceed?";

        // Add AI response asking for confirmation
        addMessage(project.id, {
          role: "assistant",
          content: confirmationMessage,
          timestamp: new Date(),
        });

        // Store the pending action
        setPendingAction({
          type: "UPDATE_TASK",
          parameters: { addSolutions: true }
        });

        return;
      } else if (currentInput.toLowerCase().includes("move task")) {
        // For move task actions, directly perform the action
        await handlePerformAction(currentInput);
        return;
      }

      // If no action was detected or we're continuing with normal processing
      // Regular chat message
        const chatResponse = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: currentInput,
            projectId: project.id,
          }),
        })

        if (!chatResponse.ok) {
          throw new Error("Failed to get AI response")
        }

        const chatData = await chatResponse.json()

        // Add AI response to state
        addMessage(project.id, {
          role: "assistant",
          content: chatData.message,
          timestamp: new Date(chatData.timestamp),
        })
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
        const tasksCreated = []
        let errorOccurred = false
        const newColumns = new Set()

        // First, create a task with the full context to potentially create a new column
        try {
          const firstResult = await createTaskViaAI(project.id,
            `This is the first task for: ${taskDescription}. Create an appropriate column if needed and make this task specific and detailed.`
          )

          if (firstResult.error) {
            errorOccurred = true
          } else {
            tasksCreated.push(firstResult.task)

            // Track any new column that was created
            if (firstResult.newColumn) {
              newColumns.add(firstResult.newColumn)
            }
          }
        } catch (error) {
          console.error(`Error creating first task:`, error)
          errorOccurred = true
        }

        // Create the remaining tasks
        for (let i = 1; i < numTasks; i++) {
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

            // Track any new column that was created
            if (result.newColumn) {
              newColumns.add(result.newColumn)
            }
          } catch (error) {
            console.error(`Error creating task ${i+1}:`, error)
            errorOccurred = true
          }
        }

        // Show results
        if (tasksCreated.length > 0) {
          // Success message
          toast.success(`Created ${tasksCreated.length} tasks successfully!`)

          // Add information about new columns if any were created
          let columnMessage = ""
          if (newColumns.size > 0) {
            columnMessage = `I've created ${newColumns.size === 1 ? "a new column" : `${newColumns.size} new columns`}: ${Array.from(newColumns).join(", ")}\n\n`
          }

          // Add AI response with task details
          const taskListMessage = `${columnMessage}I've created ${tasksCreated.length} tasks for you:\n\n` +
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

  const handleCreateColumn = async (columnName: string, columnColor: string = "blue") => {
    if (!project?.id) return

    try {
      // Show loading state
      toast.loading("Creating column...")

      // Call server action to create column
      const result = await createColumnViaAI(project.id, `Create a column named "${columnName}" with color ${columnColor}`)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Column created successfully!")

      // Add AI response to state
      addMessage(project.id, {
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      })

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error creating column:", error)
      toast.error("Failed to create column. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error creating the column. Please try again.",
        timestamp: new Date(),
      })
    }
  }

  const handleDeleteTask = async (taskIdentifier: string) => {
    if (!project?.id) return

    try {
      // Show loading state
      toast.loading("Analyzing tasks...")

      // Check if this is a domain-specific request
      const isDomainSpecific = (
        taskIdentifier.includes("related") ||
        taskIdentifier.includes("stuff") ||
        taskIdentifier.includes("things") ||
        taskIdentifier.includes("all") ||
        taskIdentifier.includes("everything")
      )

      // First, preview the task(s) to be deleted
      const previewResult = await performAIAction(project.id, `Preview delete task: ${taskIdentifier}`)

      if (previewResult.error) {
        toast.error(previewResult.error)
        return
      }

      // If we're deleting useless tasks or domain-specific tasks, show a preview first
      if (taskIdentifier.toLowerCase().includes("useless") || isDomainSpecific) {
        // Add AI response with preview
        addMessage(project.id, {
          role: "assistant",
          content: previewResult.message || "I've identified some tasks that match your criteria. Would you like me to delete them?",
          timestamp: new Date(),
        })

        // Store the pending action for confirmation
        setPendingAction({
          type: "DELETE_TASK",
          parameters: { taskDescription: taskIdentifier },
          needsConfirmation: true
        })

        // Clear loading state
        toast.dismiss()
        return
      }

      // For specific task deletion, proceed with deletion
      toast.loading("Deleting task...")

      // Call server action to delete task
      const result = await performAIAction(project.id, `Delete task: ${taskIdentifier}`)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Task deleted successfully!")

      // Add AI response to state
      addMessage(project.id, {
        role: "assistant",
        content: result.message || "I've deleted that task for you.",
        timestamp: new Date(),
      })

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error deleting task:", error)
      toast.error("Failed to delete task. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error deleting the task. Please try again.",
        timestamp: new Date(),
      })
    }
  }

  const handleDeleteColumn = async (columnIdentifier: string) => {
    if (!project?.id) return

    try {
      // Show loading state
      toast.loading("Deleting column...")

      // Call server action to delete column
      const result = await performAIAction(project.id, `Delete column: ${columnIdentifier}`)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Column deleted successfully!")

      // Add AI response to state
      addMessage(project.id, {
        role: "assistant",
        content: result.message || "I've deleted that column for you.",
        timestamp: new Date(),
      })

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error deleting column:", error)
      toast.error("Failed to delete column. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error deleting the column. Please try again.",
        timestamp: new Date(),
      })
    }
  }

  const handleAddSolutionsToTasks = async () => {
    if (!project?.id) return

    try {
      // Show loading state
      toast.loading("Analyzing tasks and generating solutions...")

      // Add AI thinking message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm analyzing your tasks and generating detailed technical solutions for each one. This might take a moment...",
        timestamp: new Date(),
      })

      // Call server action to add solutions to tasks
      const result = await performAIAction(project.id, "Update tasks with solutions")

      // Dismiss loading state
      toast.dismiss()

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Tasks updated with solutions!")

      // Add AI response to state
      addMessage(project.id, {
        role: "assistant",
        content: result.message || "I've added detailed solutions to your tasks.",
        timestamp: new Date(),
      })

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error adding solutions to tasks:", error)
      toast.error("Failed to add solutions to tasks. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error adding solutions to your tasks. Please try again.",
        timestamp: new Date(),
      })
    }
  }

  const handlePerformAction = async (actionDescription?: string) => {
    if (!project?.id || (!input.trim() && !actionDescription)) return

    try {
      // Show loading state
      toast.loading("Performing action...")

      // Call server action to perform AI action
      const result = await performAIAction(project.id, actionDescription || input)

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Success message
      toast.success("Action completed successfully!")

      // Add AI response to state
      addMessage(project.id, {
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      })

      // Clear input
      setInput("")
    } catch (error) {
      console.error("Error performing action:", error)
      toast.error("Failed to perform action. Please try again.")

      // Add error message
      addMessage(project.id, {
        role: "assistant",
        content: "I'm sorry, I encountered an error performing this action. Please try again.",
        timestamp: new Date(),
      })
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
                      onClick={() => handlePerformAction()}
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
