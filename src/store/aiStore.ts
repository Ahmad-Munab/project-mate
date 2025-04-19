'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type AIMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string | any // Allow different content types
  timestamp: Date
  id?: string // Optional unique ID for messages
  metadata?: Record<string, any> // Optional metadata for additional information
}

interface AIState {
  messages: Record<string, AIMessage[]> // projectId -> messages
  isTyping: boolean
  pendingAction: any | null // Store pending actions that need confirmation
  lastInteraction: Date | null // Track last interaction time
  addMessage: (projectId: string, message: AIMessage) => void
  setIsTyping: (isTyping: boolean) => void
  clearMessages: (projectId: string) => void
  setPendingAction: (action: any | null) => void
  updateLastInteraction: () => void
  getProjectMessages: (projectId: string) => AIMessage[]
}

/**
 * AI Store
 * Manages AI conversation state using Zustand with Immer and persistence
 */
export const useAIStore = create<AIState>()(
  immer(
    persist(
      (set, get) => ({
        messages: {},
        isTyping: false,
        pendingAction: null,
        lastInteraction: null,

        // Add a message to a project's conversation
        addMessage: (projectId, message) =>
          set(state => {
            // Ensure the project has a messages array
            if (!state.messages[projectId]) {
              state.messages[projectId] = [];
            }

            // Add the message with normalized timestamp
            state.messages[projectId].push({
              ...message,
              timestamp: new Date(message.timestamp),
              id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            });

            // Update last interaction time
            state.lastInteraction = new Date();
          }),

        // Set typing status
        setIsTyping: (isTyping) =>
          set(state => {
            state.isTyping = isTyping;
          }),

        // Clear messages for a project
        clearMessages: (projectId) =>
          set(state => {
            delete state.messages[projectId];
          }),

        // Set pending action
        setPendingAction: (action) =>
          set(state => {
            state.pendingAction = action;
          }),

        // Update last interaction time
        updateLastInteraction: () =>
          set(state => {
            state.lastInteraction = new Date();
          }),

        // Get messages for a project
        getProjectMessages: (projectId) => {
          return get().messages[projectId] || [];
        }
      }),
      {
        name: 'ai-storage',
        partialize: (state) => ({
          messages: Object.fromEntries(
            Object.entries(state.messages).map(([key, messages]) => [
              key,
              messages.filter(m => m.role !== 'system').slice(-30) // Store last 30 non-system messages
            ])
          )
        }),
      }
    )
  )
)
