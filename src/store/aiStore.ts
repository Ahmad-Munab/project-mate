'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AIMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface AIState {
  messages: Record<string, AIMessage[]> // projectId -> messages
  isTyping: boolean
  addMessage: (projectId: string, message: AIMessage) => void
  setIsTyping: (isTyping: boolean) => void
  clearMessages: (projectId: string) => void
}

export const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      messages: {},
      isTyping: false,
      addMessage: (projectId, message) => 
        set((state) => ({
          messages: {
            ...state.messages,
            [projectId]: [
              ...(state.messages[projectId] || []),
              {
                ...message,
                timestamp: new Date(message.timestamp)
              }
            ]
          }
        })),
      setIsTyping: (isTyping) => set({ isTyping }),
      clearMessages: (projectId) =>
        set((state) => {
          const newMessages = { ...state.messages }
          delete newMessages[projectId]
          return { messages: newMessages }
        }),
    }),
    {
      name: 'ai-storage',
      partialize: (state) => ({ 
        messages: Object.fromEntries(
          Object.entries(state.messages).map(([key, messages]) => [
            key, 
            messages.filter(m => m.role !== 'system').slice(-20) // Only store last 20 non-system messages
          ])
        ) 
      }),
    }
  )
)
