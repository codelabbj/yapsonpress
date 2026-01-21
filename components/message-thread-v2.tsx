"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusModal } from "@/components/status-modal"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"
import { format } from "date-fns"
import { CheckCircle2, Clock, XCircle, Phone, DollarSign, Calendar, Loader2, ChevronDown, ChevronUp } from "lucide-react"
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
  restoreScrollTop?: number
  onScrollPositionChange?: (scrollTop: number) => void
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
  onMarkAsRead,
  restoreScrollTop = 0,
  onScrollPositionChange,
}: MessageThreadProps) {
  const [selectedMessage, setSelectedMessage] = useState<SmsLog | FcmLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef<number>(0)
  const isLoadingInternalRef = useRef<boolean>(false)
  const lastRestoredRef = useRef<number | null>(null)
  const suppressLoadMoreRef = useRef<boolean>(false)

  // État d'expansion des messages longs
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`expanded-messages-${sender || 'default'}`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })

  // Sauvegarder l'état d'expansion
  useEffect(() => {
    if (typeof window !== 'undefined' && sender) {
      localStorage.setItem(`expanded-messages-${sender}`, JSON.stringify(Array.from(expandedMessages)))
    }
  }, [expandedMessages, sender])

  // Marquer comme lus
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

  /**
   * LE SCROLL : Simple, Natif, Efficace
   */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // 1. Sauvegarder pour le parent
    if (onScrollPositionChange) {
      onScrollPositionChange(scrollTop);
    }

    // 2. Logique de chargement ULTRA-AGRESSIVE
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Seuil de déclenchement : 70% de la hauteur totale
    // Ça veut dire qu'on charge la suite dès qu'il reste encore 70% à voir
    const aggressiveThreshold = scrollHeight * 0.7;

    const canLoad = hasNextPage && !isLoadingMore && !isLoadingInternalRef.current && !suppressLoadMoreRef.current && onLoadMore;

    if (canLoad && distanceFromBottom < aggressiveThreshold) {
      console.log("🚀 CHARGEMENT ANTICIPÉ (Distance restante:", Math.round(distanceFromBottom), "px | Seuil:", Math.round(aggressiveThreshold), "px)");
      isLoadingInternalRef.current = true;
      onLoadMore?.();
    }
  };

  /**
   * Restauration et Reset
   */
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    // Si on change de conversation, on reset le verrou
    isLoadingInternalRef.current = false;
    suppressLoadMoreRef.current = false;

    // Restauration du scroll
    if (restoreScrollTop > 0 && lastRestoredRef.current !== restoreScrollTop) {
      lastRestoredRef.current = restoreScrollTop;
      suppressLoadMoreRef.current = true;
      
      const container = scrollContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = restoreScrollTop;
        setTimeout(() => { suppressLoadMoreRef.current = false; }, 500);
      });
    } else if (restoreScrollTop === 0 && messages.length > 0 && lastMessageCountRef.current === 0) {
      // Nouveau thread : scroll en haut
      scrollContainerRef.current.scrollTop = 0;
    }
    
    lastMessageCountRef.current = messages.length;
  }, [sender, messages.length, restoreScrollTop]);

  /**
   * Déverrouiller après chargement
   */
  useEffect(() => {
    if (!isLoadingMore && isLoadingInternalRef.current) {
      isLoadingInternalRef.current = false;
    }
  }, [isLoadingMore]);

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

  // Helpers (SmsLog / FcmLog)
  const isFcmLog = (message: any): message is FcmLog => 'package_name' in message;
  const getMessageAmount = (message: any) => message.amount || message.extracted_data?.amount || null;
  const getMessageDate = (message: any) => isFcmLog(message) ? message.created_at : message.received_at;
  const getMessageContent = (message: any) => isFcmLog(message) ? message.body : message.content;
  const formatTimestamp = (ts: string) => { try { return format(new Date(ts), "dd/MM/yyyy HH:mm"); } catch { return ts; } };

  const shouldShowExpand = (message: (SmsLog | FcmLog)) => {
    const content = getMessageContent(message)
    return content && content.length > 300
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

  if (!sender) return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="text-center">
        <Phone className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">Sélectionnez un expéditeur</h3>
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-background">
      {/* Header fixe */}
      <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
            {sender.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{sender}</h2>
            <p className="text-xs text-blue-100">{messages.length} messages</p>
          </div>
        </div>
      </div>

      {/* Zone de scroll NATIF */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      >
        {messages.map((message) => (
          <div key={message.uid} className="flex justify-center">
            <div className="w-full max-w-4xl bg-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(message.status)}
                  {getStatusBadge(message.status, message.status_display || message.status)}
                </div>
                {getMessageAmount(message) && (
                  <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full text-green-700 font-bold text-sm">
                    <DollarSign className="h-4 w-4" /> {getMessageAmount(message)} FCFA
                  </div>
                )}
              </div>
              <div className="mb-4">
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
              <div className="flex justify-between items-center pt-3 border-t border-gray-300 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {formatTimestamp(getMessageDate(message))}
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectedMessage(message); setIsModalOpen(true); }}>
                  Statut
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Loader visuel */}
        {isLoadingMore && (
          <div className="flex flex-col items-center gap-2 py-8 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-blue-700 font-medium">Chargement...</span>
          </div>
        )}

        {!isLoadingMore && hasNextPage && (
          <div className="h-20 w-full flex items-center justify-center text-gray-400 text-sm italic">
            Continuer de défiler pour charger plus...
          </div>
        )}
      </div>

      {selectedMessage && (
        <StatusModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          message={selectedMessage}
          onStatusChange={onUpdateStatus}
          isUpdating={isUpdating}
        />
      )}
    </div>
  )
}
