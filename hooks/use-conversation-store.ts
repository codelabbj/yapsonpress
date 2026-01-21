import { create } from "zustand"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"

type Message = SmsLog | FcmLog

interface ConversationState {
  messages: Message[]
  currentPage: number
  hasNextPage: boolean
  scrollPosition: number
  messageMap: Map<string, Message>
  orderArray: string[]
}

interface ConversationStore {
  conversations: Record<string, ConversationState>
  saveConversation: (key: string, state: ConversationState) => void
  loadConversation: (key: string) => ConversationState | null
  hasConversation: (key: string) => boolean
  clearConversation: (key: string) => void
  clearAll: () => void
}

/**
 * Zustand store pour garder l'état des conversations en mémoire
 * Architecture pro type Google Messages / WhatsApp
 */
export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: {},
  saveConversation: (key, state) => {
    set(current => ({
      conversations: {
        ...current.conversations,
        [key]: {
          ...state,
          messageMap: new Map(state.messageMap),
          orderArray: [...state.orderArray],
          messages: [...state.messages],
        },
      },
    }))
  },
  loadConversation: (key) => {
    const conversation = get().conversations[key]
    if (!conversation) return null
    return {
      ...conversation,
      messageMap: new Map(conversation.messageMap),
      orderArray: [...conversation.orderArray],
      messages: [...conversation.messages],
    }
  },
  hasConversation: (key) => !!get().conversations[key],
  clearConversation: (key) => {
    set(current => {
      const next = { ...current.conversations }
      delete next[key]
      return { conversations: next }
    })
  },
  clearAll: () => set({ conversations: {} }),
}))
