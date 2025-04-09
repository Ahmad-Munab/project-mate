/**
 * Buffer memory implementation for LangChain
 */

import { BufferMemory } from "langchain/memory";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { AIMessage as LangChainAIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getRecentMessages } from "./storage";
import { AIMessage } from "./types";

// Convert our AIMessage type to LangChain message types
function convertToLangChainMessages(messages: AIMessage[]) {
  return messages.map((message) => {
    if (message.role === "user") {
      return new HumanMessage(message.content);
    } else if (message.role === "assistant") {
      return new LangChainAIMessage(message.content);
    } else {
      return new SystemMessage(message.content);
    }
  });
}

// Create a memory system for a project
export async function createProjectMemory(projectId: string) {
  try {
    // Get recent messages from the database
    const recentMessages = await getRecentMessages(projectId, 20);

    // Convert to LangChain message format
    const langChainMessages = convertToLangChainMessages(recentMessages);

    // Create a message history from the messages
    const messageHistory = new ChatMessageHistory(langChainMessages);

    // Create a buffer memory with the message history
    const memory = new BufferMemory({
      chatHistory: messageHistory,
      returnMessages: true,
      memoryKey: "chat_history",
      inputKey: "input",
    });

    return memory;
  } catch (error) {
    console.error("Failed to create project memory:", error);
    throw error;
  }
}
