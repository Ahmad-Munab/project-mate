/**
 * AI Assistant Component
 * This component renders the main AI assistant interface
 */

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { sendMessage, performAction } from "@/lib/ai/client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AIAssistantProps } from "./types";
import { useAIMessages } from "./hooks/useAIMessages";
import { useAIActions } from "./hooks/useAIActions";
import { AIHeader } from "./AIHeader";
import { AIChat } from "./AIChat";
import { AIInput } from "./AIInput";
import { AISuggestions } from "./AISuggestions";
import { AIConfirmation } from "./AIConfirmation";

export function AIAssistant({ open, onOpenChange, project }: AIAssistantProps) {
  const [suggestions, setSuggestions] = useState<string[]>([
    "Create 3 tasks for implementing user authentication",
    "Move all in-progress tasks to done",
    "Create a new column for code review",
    "What tasks are currently in the backlog?",
  ]);

  const {
    input,
    setInput,
    pendingAction,
    setPendingAction,
    scrollAreaRef,
    isTyping,
    setIsTyping,
    projectMessages,
    addUserMessage,
    addAssistantMessage,
  } = useAIMessages(project?.id, open);

  const {
    createTask,
    createMultipleTasks,
    createColumn,
    deleteTask,
    deleteColumn,
    addSolutionsToTasks,
    performAction: performAIAction,
    generateSuggestions,
    isProcessing,
  } = useAIActions(project?.id);

  // Generate suggestions when the component mounts or project changes
  useEffect(() => {
    if (project?.id && open) {
      generateSuggestions().then((result) => {
        if (result.success && result.suggestions) {
          setSuggestions(result.suggestions);
        }
      });
    }
  }, [project?.id, open, generateSuggestions]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!project?.id || !input.trim() || isTyping) return;

    const currentInput = input.trim();
    setInput("");
    addUserMessage(currentInput);
    setIsTyping(true);

    // Check for pending action confirmation
    if (pendingAction) {
      // Check if the user confirmed or denied the action
      const isConfirmed = (
        currentInput.toLowerCase().includes("yes") ||
        currentInput.toLowerCase().includes("confirm") ||
        currentInput.toLowerCase().includes("proceed") ||
        currentInput.toLowerCase().includes("ok") ||
        currentInput.toLowerCase().includes("sure") ||
        currentInput.toLowerCase() === "y"
      );

      const isDenied = (
        currentInput.toLowerCase().includes("no") ||
        currentInput.toLowerCase().includes("cancel") ||
        currentInput.toLowerCase().includes("don't") ||
        currentInput.toLowerCase().includes("dont") ||
        currentInput.toLowerCase().includes("stop") ||
        currentInput.toLowerCase() === "n"
      );

      if (isConfirmed || isDenied) {
        if (isConfirmed) {
          await handleConfirmAction();
        } else {
          // User denied the action
          addAssistantMessage("I've cancelled the action as requested.");
        }

        // Clear the pending action
        setPendingAction(null);
        setIsTyping(false);
        return;
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
        await handleDeleteTask(currentInput);
        return;
      } else if (currentInput.toLowerCase().includes("delete column") ||
                 currentInput.toLowerCase().includes("remove column")) {
        await handleDeleteColumn(currentInput);
        return;
      } else if (currentInput.toLowerCase().includes("solution") ||
                 currentInput.toLowerCase().includes("edit tasks to provide")) {
        await handleAddSolutionsToTasks();
        return;
      } else if (currentInput.toLowerCase().includes("move task")) {
        await handlePerformAction(currentInput);
        return;
      }

      // Regular chat message
      const response = await sendMessage(project.id, currentInput);

      // Add AI response to state
      addAssistantMessage(response.message);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast.error("Failed to get AI response. Please try again.");

      // Add error message
      addAssistantMessage("I'm sorry, I encountered an error processing your request. Please try again.");
    } finally {
      setIsTyping(false);
    }
  }, [
    project?.id,
    input,
    isTyping,
    pendingAction,
    addUserMessage,
    addAssistantMessage,
    setIsTyping,
    setPendingAction,
    setInput
  ]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
    // Use setTimeout to ensure the input is set before sending
    setTimeout(() => {
      handleSendMessage();
    }, 0);
  }, [setInput]);

  // Handle creating a task
  const handleCreateTask = useCallback(async () => {
    if (!project?.id || !input.trim()) return;

    const result = await createTask(input);

    if (result.success) {
      setInput("");
    }
  }, [project?.id, input, createTask, setInput]);

  // Handle creating multiple tasks
  const handleCreateMultipleTasks = useCallback(async (taskDescription: string) => {
    if (!project?.id) return;

    const result = await createMultipleTasks(taskDescription);

    if (result.success) {
      setInput("");
    }
  }, [project?.id, createMultipleTasks, setInput]);

  // Handle creating a column
  const handleCreateColumn = useCallback(async (columnName: string, columnColor: string = "blue") => {
    if (!project?.id) return;

    const result = await createColumn(columnName, columnColor);

    if (result.success) {
      setInput("");
    }
  }, [project?.id, createColumn, setInput]);

  // Handle deleting a task
  const handleDeleteTask = useCallback(async (taskIdentifier: string) => {
    if (!project?.id) return;

    // Extract task description
    const taskDescMatch = taskIdentifier.match(/task[:\s]+([\w\s]+)/i);
    const taskDesc = taskDescMatch ? taskDescMatch[1].trim() : taskIdentifier;

    const result = await deleteTask(taskDesc);

    if (result.success && result.needsConfirmation) {
      // Store the pending action
      setPendingAction({
        type: "DELETE_TASK",
        parameters: { taskDescription: taskDesc }
      });
    }
  }, [project?.id, deleteTask, setPendingAction]);

  // Handle deleting a column
  const handleDeleteColumn = useCallback(async (columnIdentifier: string) => {
    if (!project?.id) return;

    // Extract column name
    const columnNameMatch = columnIdentifier.match(/column[:\s]+([\w\s]+)/i);
    const columnDesc = columnNameMatch ? columnNameMatch[1].trim() : columnIdentifier;

    // Add AI response asking for confirmation
    addAssistantMessage(`I'll delete the column matching "${columnDesc}". Any tasks in this column will be moved to the default column. Are you sure you want to proceed?`);

    // Store the pending action
    setPendingAction({
      type: "DELETE_COLUMN",
      parameters: { columnName: columnDesc }
    });
  }, [project?.id, addAssistantMessage, setPendingAction]);

  // Handle adding solutions to tasks
  const handleAddSolutionsToTasks = useCallback(async () => {
    if (!project?.id) return;

    // Add AI response asking for confirmation
    addAssistantMessage("I'll analyze your tasks and add detailed technical solutions to each one. This will help you understand how to implement each task. Would you like me to proceed?");

    // Store the pending action
    setPendingAction({
      type: "UPDATE_TASK",
      parameters: { addSolutions: true }
    });
  }, [project?.id, addAssistantMessage, setPendingAction]);

  // Handle performing an action
  const handlePerformAction = useCallback(async (actionDescription?: string) => {
    if (!project?.id || (!input.trim() && !actionDescription)) return;

    const result = await performAIAction(actionDescription || input);

    if (result.success) {
      setInput("");
    }
  }, [project?.id, input, performAIAction, setInput]);

  // Handle confirming an action
  const handleConfirmAction = useCallback(async () => {
    if (!pendingAction || !project?.id) return;

    try {
      // Handle different action types
      switch (pendingAction.type) {
        case "CREATE_TASK":
          await handleCreateMultipleTasks(pendingAction.parameters.description || "");
          break;

        case "CREATE_COLUMN":
          await handleCreateColumn(
            pendingAction.parameters.columnName || "New Column",
            pendingAction.parameters.columnColor as string || "blue"
          );
          break;

        case "MOVE_TASK":
        case "UPDATE_TASK":
          if (pendingAction.parameters.addSolutions) {
            await addSolutionsToTasks();
          } else {
            await handlePerformAction(JSON.stringify(pendingAction.parameters));
          }
          break;

        case "DELETE_TASK":
          await deleteTask(pendingAction.parameters.taskId || pendingAction.parameters.taskDescription || "");
          break;

        case "DELETE_COLUMN":
          await deleteColumn(pendingAction.parameters.columnId || pendingAction.parameters.columnName || "");
          break;

        default:
          // For other actions, add a response
          addAssistantMessage("I'm not sure how to perform that action yet. I'll add this capability soon.");
          break;
      }
    } catch (error) {
      console.error("Error executing confirmed action:", error);
      toast.error("Failed to execute the action. Please try again.");

      // Add error message
      addAssistantMessage("I'm sorry, I encountered an error performing this action. Please try again.");
    }
  }, [
    pendingAction,
    project?.id,
    handleCreateMultipleTasks,
    handleCreateColumn,
    handlePerformAction,
    deleteTask,
    deleteColumn,
    addSolutionsToTasks,
    addAssistantMessage
  ]);

  // Handle cancelling an action
  const handleCancelAction = useCallback(() => {
    setPendingAction(null);
    addAssistantMessage("I've cancelled the action as requested.");
  }, [setPendingAction, addAssistantMessage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col h-[100dvh] border-l overflow-hidden"
      >
        <AIHeader onClose={() => onOpenChange(false)} />

        <AIChat
          messages={projectMessages}
          isTyping={isTyping}
          scrollAreaRef={scrollAreaRef}
        />

        {pendingAction ? (
          <AIConfirmation
            pendingAction={pendingAction}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelAction}
            isProcessing={isProcessing[pendingAction.type.toLowerCase()]}
          />
        ) : (
          <AISuggestions
            suggestions={suggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        )}

        <AIInput
          input={input}
          setInput={setInput}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          onCreateTask={handleCreateTask}
          onPerformAction={() => handlePerformAction()}
          project={project}
          isProcessing={isProcessing}
        />
      </SheetContent>
    </Sheet>
  );
}

// Also export as default for easier imports
export default AIAssistant;
