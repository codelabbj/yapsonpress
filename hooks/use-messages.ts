import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"

type Message = SmsLog | FcmLog

interface UseMessagesOptions {
  refreshInterval?: number
  onNewMessages?: (messages: Message[]) => void
}

interface UseMessagesReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  newMessageIds: Set<string> // IDs des nouveaux messages pour les notifications
  addMessages: (newMessages: Message[], replace?: boolean) => void
  updateMessage: (uid: string, updates: Partial<Message>) => void
  removeMessage: (uid: string) => void
  clearMessages: () => void
  getMessageById: (uid: string) => Message | undefined
  hasMessage: (uid: string) => boolean
  markMessagesAsRead: (uids: string[]) => void
}

/**
 * Hook professionnel pour gérer les messages avec :
 * - Déduplication automatique par UID
 * - Tri stable par date (plus récent en premier)
 * - Fusion intelligente des nouveaux messages
 * - Préservation de l'ordre et de l'état
 */
export function useMessages(options: UseMessagesOptions = {}): UseMessagesReturn {
  const { refreshInterval, onNewMessages } = options
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  
  // Référence pour éviter les mises à jour pendant les opérations en cours
  const isUpdatingRef = useRef(false)
  const messagesMapRef = useRef<Map<string, Message>>(new Map())
  const lastSortedRef = useRef<Message[]>([]) // Cache pour éviter les tris inutiles

  /**
   * Obtient la date d'un message (helper pour TypeScript)
   */
  const getMessageDate = (message: Message): string => {
    if ('created_at' in message) {
      return (message as FcmLog).created_at
    }
    return (message as SmsLog).received_at
  }

  /**
   * Compare deux messages pour déterminer leur ordre
   * Plus récent en premier (ordre décroissant)
   */
  const compareMessages = useCallback((a: Message, b: Message): number => {
    const dateA = getMessageDate(a)
    const dateB = getMessageDate(b)
    
    // Comparaison par timestamp (plus récent en premier)
    const timestampA = new Date(dateA).getTime()
    const timestampB = new Date(dateB).getTime()
    
    // Si même timestamp, utiliser l'UID pour un tri stable
    if (timestampA === timestampB) {
      return a.uid.localeCompare(b.uid)
    }
    
    return timestampB - timestampA // Ordre décroissant
  }, [])

  /**
   * Déduplique et trie les messages (optimisé avec cache)
   */
  const deduplicateAndSort = useCallback((messagesList: Message[]): Message[] => {
    // Vérifier si le tri est nécessaire (optimisation)
    if (messagesList.length === 0) {
      messagesMapRef.current.clear()
      lastSortedRef.current = []
      return []
    }

    // Créer un Map pour déduplication par UID
    const uniqueMap = new Map<string, Message>()
    
    // Ajouter tous les messages (les plus récents écrasent les anciens si même UID)
    messagesList.forEach(message => {
      const existing = uniqueMap.get(message.uid)
      if (!existing) {
        uniqueMap.set(message.uid, message)
      } else {
        // Si le message existe déjà, garder le plus récent
        const existingDate = getMessageDate(existing)
        const newDate = getMessageDate(message)
        if (new Date(newDate) > new Date(existingDate)) {
          uniqueMap.set(message.uid, message)
        }
      }
    })
    
    // Vérifier si le tri est nécessaire (si les messages sont déjà triés)
    const uniqueArray = Array.from(uniqueMap.values())
    const needsSorting = uniqueArray.length !== lastSortedRef.current.length ||
      uniqueArray.some((msg, idx) => {
        const lastMsg = lastSortedRef.current[idx]
        return !lastMsg || msg.uid !== lastMsg.uid
      })
    
    // Trier seulement si nécessaire
    const sorted = needsSorting ? uniqueArray.sort(compareMessages) : lastSortedRef.current
    
    // Mettre à jour les références
    messagesMapRef.current = uniqueMap
    lastSortedRef.current = sorted
    
    return sorted
  }, [compareMessages])

  /**
   * Ajoute des messages à la liste existante
   * @param newMessages - Nouveaux messages à ajouter
   * @param replace - Si true, remplace tous les messages. Si false, fusionne avec les existants
   */
  const addMessages = useCallback((newMessages: Message[], replace: boolean = false) => {
    if (isUpdatingRef.current) {
      console.warn("⚠️ Mise à jour des messages en cours, opération ignorée")
      return
    }

    isUpdatingRef.current = true
    setError(null)

    try {
      setMessages(prev => {
        // Détecter les nouveaux messages AVANT la fusion
        const prevUids = new Set(prev.map(m => m.uid))
        const actuallyNew = newMessages.filter(m => !prevUids.has(m.uid))
        
        const messagesToProcess = replace ? newMessages : [...prev, ...newMessages]
        const processed = deduplicateAndSort(messagesToProcess)
        
        // Notifier les nouveaux messages uniquement s'il y en a vraiment de nouveaux
        if (actuallyNew.length > 0) {
          // Marquer les nouveaux messages pour les notifications
          setNewMessageIds(prev => {
            const newSet = new Set(prev)
            actuallyNew.forEach(msg => newSet.add(msg.uid))
            return newSet
          })
          
          if (onNewMessages) {
            // Appeler le callback de manière asynchrone pour ne pas bloquer
            setTimeout(() => onNewMessages(actuallyNew), 0)
          }
        }
        
        return processed
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout des messages"
      setError(errorMessage)
      console.error("❌ Erreur lors de l'ajout des messages:", err)
    } finally {
      isUpdatingRef.current = false
    }
  }, [deduplicateAndSort, onNewMessages])

  /**
   * Met à jour un message existant
   */
  const updateMessage = useCallback((uid: string, updates: Partial<Message>) => {
    setMessages(prev => {
      const index = prev.findIndex(m => m.uid === uid)
      if (index === -1) {
        console.warn(`⚠️ Message ${uid} non trouvé pour mise à jour`)
        return prev
      }

      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      
      // Retrier après mise à jour si la date a changé
      return deduplicateAndSort(updated)
    })
  }, [deduplicateAndSort])

  /**
   * Supprime un message
   */
  const removeMessage = useCallback((uid: string) => {
    setMessages(prev => prev.filter(m => m.uid !== uid))
    messagesMapRef.current.delete(uid)
  }, [])

  /**
   * Vide tous les messages
   */
  const clearMessages = useCallback(() => {
    setMessages([])
    messagesMapRef.current.clear()
  }, [])

  /**
   * Récupère un message par son UID
   */
  const getMessageById = useCallback((uid: string): Message | undefined => {
    return messagesMapRef.current.get(uid) || messages.find(m => m.uid === uid)
  }, [messages])

  /**
   * Vérifie si un message existe
   */
  const hasMessage = useCallback((uid: string): boolean => {
    return messagesMapRef.current.has(uid) || messages.some(m => m.uid === uid)
  }, [messages])

  /**
   * Marque des messages comme lus (retire de la liste des nouveaux)
   */
  const markMessagesAsRead = useCallback((uids: string[]) => {
    setNewMessageIds(prev => {
      const newSet = new Set(prev)
      uids.forEach(uid => newSet.delete(uid))
      return newSet
    })
  }, [])

  // Synchroniser la référence avec l'état
  useEffect(() => {
    const newMap = new Map<string, Message>()
    messages.forEach(msg => newMap.set(msg.uid, msg))
    messagesMapRef.current = newMap
  }, [messages])

  // Mémoriser le Set des nouveaux messages pour éviter les re-renders
  const newMessageIdsMemo = useMemo(() => newMessageIds, [newMessageIds])

  return {
    messages,
    isLoading,
    error,
    newMessageIds: newMessageIdsMemo,
    addMessages,
    updateMessage,
    removeMessage,
    clearMessages,
    getMessageById,
    hasMessage,
    markMessagesAsRead,
  }
}

