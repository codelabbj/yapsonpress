import { useRef, useCallback } from "react"
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

interface UseConversationCacheReturn {
  saveConversation: (
    conversationKey: string,
    messages: Message[],
    currentPage: number,
    hasNextPage: boolean,
    scrollPosition: number,
    messageMap: Map<string, Message>,
    orderArray: string[]
  ) => void
  loadConversation: (conversationKey: string) => ConversationState | null
  clearConversation: (conversationKey: string) => void
  hasConversation: (conversationKey: string) => boolean
  clearAll: () => void
}

/**
 * Hook pour garder l'état de chaque conversation en cache
 * Architecture Google Messages / WhatsApp
 * 
 * Principe :
 * - Chaque conversation a une clé unique : "sms-SENDER" ou "wave-PACKAGE"
 * - Quand on change de conversation, on sauvegarde l'état
 * - Quand on revient, on restaure l'état (messages, scroll, page...)
 * - Plus besoin de recharger !
 */
export function useConversationCache(): UseConversationCacheReturn {
  // Cache en mémoire pour toutes les conversations
  const cacheRef = useRef<Map<string, ConversationState>>(new Map())

  /**
   * Sauvegarde l'état complet d'une conversation
   */
  const saveConversation = useCallback(
    (
      conversationKey: string,
      messages: Message[],
      currentPage: number,
      hasNextPage: boolean,
      scrollPosition: number,
      messageMap: Map<string, Message>,
      orderArray: string[]
    ) => {
      console.log(`💾 Sauvegarde conversation: ${conversationKey}`, {
        messagesCount: messages.length,
        currentPage,
        hasNextPage,
        scrollPosition,
      })

      cacheRef.current.set(conversationKey, {
        messages,
        currentPage,
        hasNextPage,
        scrollPosition,
        messageMap: new Map(messageMap), // Clone du Map
        orderArray: [...orderArray], // Clone du tableau
      })
    },
    []
  )

  /**
   * Charge l'état d'une conversation depuis le cache
   */
  const loadConversation = useCallback((conversationKey: string): ConversationState | null => {
    const cached = cacheRef.current.get(conversationKey)
    
    if (cached) {
      console.log(`📂 Restauration conversation: ${conversationKey}`, {
        messagesCount: cached.messages.length,
        currentPage: cached.currentPage,
        scrollPosition: cached.scrollPosition,
      })
      return cached
    }

    console.log(`❌ Pas de cache pour: ${conversationKey}`)
    return null
  }, [])

  /**
   * Supprime une conversation du cache
   */
  const clearConversation = useCallback((conversationKey: string) => {
    console.log(`🗑️ Suppression conversation: ${conversationKey}`)
    cacheRef.current.delete(conversationKey)
  }, [])

  /**
   * Vérifie si une conversation est en cache
   */
  const hasConversation = useCallback((conversationKey: string): boolean => {
    return cacheRef.current.has(conversationKey)
  }, [])

  /**
   * Vide tout le cache
   */
  const clearAll = useCallback(() => {
    console.log(`🗑️ Vidage complet du cache (${cacheRef.current.size} conversations)`)
    cacheRef.current.clear()
  }, [])

  return {
    saveConversation,
    loadConversation,
    clearConversation,
    hasConversation,
    clearAll,
  }
}

