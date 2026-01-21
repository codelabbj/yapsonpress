import { useState, useCallback, useRef, useMemo } from "react"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"

type Message = SmsLog | FcmLog

interface UseMessagesV2Options {
  onNewMessages?: (messages: Message[]) => void
}

interface UseMessagesV2Return {
  messages: Message[]
  isLoading: boolean
  error: string | null
  addMessages: (newMessages: Message[], position?: 'top' | 'bottom') => void
  updateMessage: (uid: string, updates: Partial<Message>) => void
  removeMessage: (uid: string) => void
  clearMessages: () => void
  getMessageById: (uid: string) => Message | undefined
  hasMessage: (uid: string) => boolean
  markMessagesAsRead: (uids: string[]) => void
  newMessageIds: Set<string>
  // Méthodes pour le cache
  getMessagesMap: () => Map<string, Message>
  getOrderArray: () => string[]
  restoreState: (messageMap: Map<string, Message>, orderArray: string[]) => void
}

/**
 * Hook V2 - Architecture stable pour gérer les messages
 * 
 * Principe fondamental :
 * 1. Les messages sont stockés dans un Map (messagesMapRef) indexé par UID
 * 2. L'ordre d'affichage est géré par un tableau d'UIDs (orderRef)
 * 3. RÈGLE D'OR : Les messages existants ne bougent JAMAIS
 * 4. Les nouveaux messages vont EN HAUT (refresh) ou EN BAS (pagination)
 * 5. Pas de retri automatique = stabilité totale
 */
export function useMessagesV2(options: UseMessagesV2Options = {}): UseMessagesV2Return {
  const { onNewMessages } = options
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  
  // Map pour stockage rapide par UID (accès O(1))
  const messagesMapRef = useRef<Map<string, Message>>(new Map())
  
  // Tableau qui définit l'ordre d'affichage (source de vérité)
  const orderRef = useRef<string[]>([])

  /**
   * Obtient la date d'un message
   */
  const getMessageDate = (message: Message): string => {
    if ('created_at' in message) {
      return (message as FcmLog).created_at
    }
    return (message as SmsLog).received_at
  }

  /**
   * Trie les messages par date (plus récent en premier)
   * Utilisé UNIQUEMENT pour le tri initial des nouveaux messages
   */
  const sortMessages = useCallback((msgs: Message[]): Message[] => {
    return [...msgs].sort((a, b) => {
      const dateA = getMessageDate(a)
      const dateB = getMessageDate(b)
      const timestampA = new Date(dateA).getTime()
      const timestampB = new Date(dateB).getTime()
      
      if (timestampA === timestampB) {
        return a.uid.localeCompare(b.uid)
      }
      
      return timestampB - timestampA // Plus récent en premier
    })
  }, [])

  /**
   * Reconstruit le tableau de messages depuis orderRef et messagesMapRef
   */
  const rebuildMessagesArray = useCallback((): Message[] => {
    return orderRef.current
      .map(uid => messagesMapRef.current.get(uid))
      .filter((msg): msg is Message => msg !== undefined)
  }, [])

  /**
   * Ajoute des messages de manière STABLE
   * 
   * @param newMessages - Messages à ajouter
   * @param position - 'top' pour nouveaux messages (refresh), 'bottom' pour pagination
   */
  const addMessages = useCallback((newMessages: Message[], position: 'top' | 'bottom' = 'top') => {
    if (newMessages.length === 0) return

    setError(null)

    try {
      const actuallyNew: Message[] = []
      const toUpdate: Message[] = []

      // Étape 1 : Séparer les nouveaux messages des mises à jour
      newMessages.forEach(message => {
        if (messagesMapRef.current.has(message.uid)) {
          toUpdate.push(message)
        } else {
          actuallyNew.push(message)
        }
      })

      // Étape 2 : Trier UNIQUEMENT les nouveaux messages
      const sortedNew = actuallyNew.length > 0 ? sortMessages(actuallyNew) : []

      // Étape 3 : Mettre à jour le Map (tous les messages)
      newMessages.forEach(message => {
        messagesMapRef.current.set(message.uid, message)
      })

      // Étape 4 : Mettre à jour orderRef selon la position
      if (sortedNew.length > 0) {
        const newUids = sortedNew.map(m => m.uid)
        
        if (position === 'top') {
          // Nouveaux messages en HAUT (refresh)
          orderRef.current = [...newUids, ...orderRef.current]
          console.log(`✨ ${sortedNew.length} nouveaux messages ajoutés en HAUT`)
        } else {
          // Messages de pagination en BAS (scroll infini)
          orderRef.current = [...orderRef.current, ...newUids]
          console.log(`📥 ${sortedNew.length} messages ajoutés en BAS (pagination)`)
        }

        // Marquer comme nouveaux SEULEMENT si ajoutés en haut
        if (position === 'top') {
          setNewMessageIds(prev => {
            const newSet = new Set(prev)
            sortedNew.forEach(msg => newSet.add(msg.uid))
            return newSet
          })

          // Notifier
          if (onNewMessages) {
            setTimeout(() => onNewMessages(sortedNew), 0)
          }
        }
      }

      // Étape 5 : Reconstruire le tableau de messages
      setMessages(rebuildMessagesArray())

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout des messages"
      setError(errorMessage)
      console.error("❌ Erreur addMessages:", err)
    }
  }, [sortMessages, rebuildMessagesArray, onNewMessages])

  /**
   * Met à jour un message existant SANS changer sa position
   */
  const updateMessage = useCallback((uid: string, updates: Partial<Message>) => {
    const existing = messagesMapRef.current.get(uid)
    if (!existing) {
      console.warn(`⚠️ Message ${uid} non trouvé`)
      return
    }

    // Mettre à jour dans le Map (position inchangée dans orderRef)
    messagesMapRef.current.set(uid, { ...existing, ...updates })
    
    // Reconstruire le tableau (même ordre)
    setMessages(rebuildMessagesArray())
  }, [rebuildMessagesArray])

  /**
   * Supprime un message
   */
  const removeMessage = useCallback((uid: string) => {
    messagesMapRef.current.delete(uid)
    orderRef.current = orderRef.current.filter(id => id !== uid)
    
    setMessages(rebuildMessagesArray())
  }, [rebuildMessagesArray])

  /**
   * Vide tous les messages
   */
  const clearMessages = useCallback(() => {
    messagesMapRef.current.clear()
    orderRef.current = []
    setMessages([])
    setNewMessageIds(new Set())
    console.log("🧹 Messages cleared")
  }, [])

  /**
   * Récupère un message par UID
   */
  const getMessageById = useCallback((uid: string): Message | undefined => {
    return messagesMapRef.current.get(uid)
  }, [])

  /**
   * Vérifie si un message existe
   */
  const hasMessage = useCallback((uid: string): boolean => {
    return messagesMapRef.current.has(uid)
  }, [])

  /**
   * Marque des messages comme lus (retire des nouveaux)
   */
  const markMessagesAsRead = useCallback((uids: string[]) => {
    setNewMessageIds(prev => {
      const newSet = new Set(prev)
      uids.forEach(uid => newSet.delete(uid))
      return newSet
    })
  }, [])

  /**
   * Obtient le Map des messages (pour le cache)
   */
  const getMessagesMap = useCallback((): Map<string, Message> => {
    return new Map(messagesMapRef.current)
  }, [])

  /**
   * Obtient le tableau d'ordre (pour le cache)
   */
  const getOrderArray = useCallback((): string[] => {
    return [...orderRef.current]
  }, [])

  /**
   * Restaure l'état depuis le cache
   */
  const restoreState = useCallback((messageMap: Map<string, Message>, orderArray: string[]) => {
    console.log(`🔄 Restauration état: ${messageMap.size} messages`)
    messagesMapRef.current = new Map(messageMap)
    orderRef.current = [...orderArray]
    setMessages(rebuildMessagesArray())
  }, [rebuildMessagesArray])

  const newMessageIdsMemo = useMemo(() => newMessageIds, [newMessageIds])

  return {
    messages,
    isLoading,
    error,
    addMessages,
    updateMessage,
    removeMessage,
    clearMessages,
    getMessageById,
    hasMessage,
    markMessagesAsRead,
    newMessageIds: newMessageIdsMemo,
    getMessagesMap,
    getOrderArray,
    restoreState,
  }
}
