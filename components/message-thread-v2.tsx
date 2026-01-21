"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusModal } from "@/components/status-modal"
import type { SmsLog, SmsLogsResponse } from "@/lib/api"
import type { FcmLog, FcmLogsResponse } from "@/lib/fcm-api"
import { format } from "date-fns"
import { CheckCircle2, Clock, XCircle, Phone, DollarSign, Calendar, User, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useRef, useCallback, useState } from "react"

interface MessageThreadProps {
  messages: (SmsLog | FcmLog)[]
  sender: string | null
  onUpdateStatus: (uid: string, status: "approved" | "no_order") => void
  isLoading?: boolean
  isUpdating?: boolean
  hasNextPage?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  currentPage?: number
  isWaveMode?: boolean
  newMessageIds?: Set<string>
  onMarkAsRead?: (uids: string[]) => void
}

export function MessageThread({ 
  messages, 
  sender, 
  onUpdateStatus, 
  isLoading, 
  isUpdating, 
  hasNextPage, 
  isLoadingMore, 
  onLoadMore, 
  currentPage, 
  isWaveMode, 
  newMessageIds = new Set(), 
  onMarkAsRead 
}: MessageThreadProps) {
  const [selectedMessage, setSelectedMessage] = useState<SmsLog | FcmLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const lastMessageCountRef = useRef<number>(0)
  const isLoadingRef = useRef<boolean>(false)
  
  // État d'expansion des messages longs
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`expanded-messages-${sender || 'default'}`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })

  // Sauvegarder l'état d'expansion dans localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && sender) {
      localStorage.setItem(`expanded-messages-${sender}`, JSON.stringify(Array.from(expandedMessages)))
    }
  }, [expandedMessages, sender])

  // Marquer les messages comme lus après un délai
  useEffect(() => {
    if (newMessageIds.size > 0 && onMarkAsRead) {
      const timer = setTimeout(() => {
        const visibleUids = messages
          .filter(msg => newMessageIds.has(msg.uid))
          .slice(0, 5)
          .map(msg => msg.uid)
        if (visibleUids.length > 0) {
          onMarkAsRead(visibleUids)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [newMessageIds, messages, onMarkAsRead])

  const handleMessageClick = (message: SmsLog | FcmLog) => {
    setSelectedMessage(message)
    setIsModalOpen(true)
  }

  const handleStatusChange = (uid: string, status: "approved" | "no_order") => {
    onUpdateStatus(uid, status)
  }

  const toggleMessageExpansion = useCallback((uid: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(uid)) {
        newSet.delete(uid)
      } else {
        newSet.add(uid)
      }
      return newSet
    })
  }, [])

  const isMessageExpanded = useCallback((uid: string) => expandedMessages.has(uid), [expandedMessages])

  // Helper functions
  const isFcmLog = (message: SmsLog | FcmLog): message is FcmLog => {
    return 'package_name' in message && 'title' in message
  }

  const getMessageAmount = (message: SmsLog | FcmLog): string | null => {
    if (isFcmLog(message)) {
      return message.data?.wave_payment_data?.amount?.toString() || null
    }
    return message.amount?.toString() || null
  }

  const getMessageDate = (message: SmsLog | FcmLog): string => {
    if (isFcmLog(message)) {
      return message.created_at
    }
    return message.received_at
  }

  const getMessageContent = (message: SmsLog | FcmLog): string => {
    if (isFcmLog(message)) {
      return message.body || ""
    }
    return message.content
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy HH:mm")
    } catch {
      return timestamp
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "no_order":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string, statusDisplay: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{statusDisplay}</Badge>
      case "no_order":
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">{statusDisplay}</Badge>
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{statusDisplay}</Badge>
    }
  }

  const shouldShowExpand = (message: SmsLog | FcmLog) => {
    const content = getMessageContent(message)
    return content && content.length > 300
  }

  /**
   * SCROLL INFINI PRO - Architecture Google Messages
   * 
   * Principe :
   * - Préchargement avant d'atteindre la fin (offset dynamique)
   * - Protection avec ref pour éviter appels multiples
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const scrollElement = target.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
    
    if (!scrollElement) return

    const { scrollTop, scrollHeight, clientHeight } = scrollElement
    scrollContainerRef.current = scrollElement
    
    // Distance du bas
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    // Précharger avant la fin (au moins 300px ou 75% du viewport)
    const prefetchOffset = Math.max(300, Math.floor(clientHeight * 0.75))
    
    // Charger si proche du bas ET pas déjà en train de charger
    const shouldLoadMore = 
      distanceFromBottom < prefetchOffset && 
      hasNextPage && 
      !isLoadingMore && 
      !isLoading && 
      !isLoadingRef.current &&
      onLoadMore
    
    if (shouldLoadMore) {
      console.log(`📥 Trigger LoadMore - Distance: ${distanceFromBottom}px`)
      isLoadingRef.current = true
      onLoadMore()
    }
  }, [hasNextPage, isLoadingMore, isLoading, onLoadMore])
  
  /**
   * Reset du verrou quand le chargement est terminé
   */
  useEffect(() => {
    if (!isLoadingMore && isLoadingRef.current) {
      // Petit délai de sécurité
      setTimeout(() => {
        isLoadingRef.current = false
      }, 500)
    }
  }, [isLoadingMore])

  /**
   * Préservation du scroll - SIMPLIFIÉ pour scroll infini fluide
   * 
   * Avec messages en BAS pour pagination, pas besoin d'ajuster le scroll !
   */
  useEffect(() => {
    // Chargement initial : scroll en haut
    if (lastMessageCountRef.current === 0 && messages.length > 0) {
      lastMessageCountRef.current = messages.length
      if (scrollContainerRef.current) {
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0
          }
        })
      }
      return
    }

    // Mise à jour du compteur
    if (messages.length !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
    }
  }, [messages.length])


  if (!sender) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <Phone className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Sélectionnez un expéditeur</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Choisissez un expéditeur pour voir les messages
          </p>
        </div>
      </div>
    )
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col bg-background">
        <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 flex-shrink-0">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-3 sm:p-4 lg:p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-center">
              <Skeleton className="h-32 w-full max-w-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-blue-500 text-white font-semibold text-sm sm:text-base lg:text-lg flex-shrink-0">
              {sender.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white truncate">{sender}</h2>
              <p className="text-xs sm:text-sm text-blue-100">
                {messages.length} message{messages.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea 
        ref={scrollAreaRef}
        className="p-3 sm:p-4 lg:p-6" 
        style={{ height: 'calc(100vh - 200px)' }}
        onScrollCapture={handleScroll}
      >
        <div className="space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <div key={message.uid} className="mb-4 sm:mb-6 lg:mb-8 flex justify-center">
              <div className="relative w-full max-w-full sm:max-w-lg lg:max-w-4xl">
                <div
                  className="bg-gray-200 rounded-xl sm:rounded-2xl rounded-bl-md p-4 sm:p-5 lg:p-6 shadow-sm w-full transition-all duration-300"
                >
                  <div className="mb-3 sm:mb-4 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(message.status)}
                        {getStatusBadge(
                          message.status,
                          message.status_display || message.status
                        )}
                      </div>
                    </div>
                    {getMessageAmount(message) && (
                      <div className="flex items-center gap-1 bg-green-100 px-2 sm:px-3 py-1 rounded-full flex-shrink-0">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-700" />
                        <span className="font-semibold text-xs sm:text-sm text-green-700">
                          {getMessageAmount(message)} FCFA
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <p 
                      className={`text-xs sm:text-sm lg:text-base text-gray-900 whitespace-pre-wrap break-words ${
                        shouldShowExpand(message) && !isMessageExpanded(message.uid)
                          ? 'line-clamp-6'
                          : ''
                      }`}
                    >
                      {getMessageContent(message)}
                    </p>
                    
                    {shouldShowExpand(message) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMessageExpansion(message.uid)}
                        className="mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0 h-auto font-medium"
                      >
                        {isMessageExpanded(message.uid) ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Voir moins
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Voir plus
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 border-t border-gray-300 pt-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{formatTimestamp(getMessageDate(message))}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMessageClick(message)}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Changer le statut
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoadingMore && (
            <div className="flex justify-center py-6 sm:py-8">
              <div className="flex flex-col items-center gap-3 bg-blue-50 border-2 border-blue-200 rounded-xl px-6 py-4 sm:px-8 sm:py-5 shadow-md">
                <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-blue-600" />
                <span className="text-sm sm:text-base font-semibold text-blue-700">
                  Chargement de plus de messages...
                </span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {!isLoadingMore && hasNextPage && (
            <div className="flex justify-center py-6 sm:py-8">
              <div className="text-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl px-6 py-4 sm:px-8 sm:py-5">
                <p className="text-sm sm:text-base text-gray-600 mb-2">
                  📥 Faites défiler vers le bas pour charger plus
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  {messages.length} messages chargés
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedMessage && (
        <StatusModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          message={selectedMessage}
          onStatusChange={handleStatusChange}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}

