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
import { CheckCircle2, Clock, XCircle, Phone, DollarSign, Calendar, User, Loader2 } from "lucide-react"
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
}

export function MessageThread({ messages, sender, onUpdateStatus, isLoading, isUpdating, hasNextPage, isLoadingMore, onLoadMore, currentPage, isWaveMode }: MessageThreadProps) {
  const [selectedMessage, setSelectedMessage] = useState<SmsLog | FcmLog | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleMessageClick = (message: SmsLog | FcmLog) => {
    setSelectedMessage(message)
    setIsModalOpen(true)
  }

  const handleStatusChange = (uid: string, status: "approved" | "no_order") => {
    onUpdateStatus(uid, status)
  }

  // Helper functions to determine message type and extract data
  const isFcmLog = (message: SmsLog | FcmLog): message is FcmLog => {
    return 'package_name' in message && 'title' in message
  }

  const getMessageAmount = (message: SmsLog | FcmLog): string | null => {
    if (isFcmLog(message)) {
      return message.data?.wave_payment_data?.amount?.toString() || null
    } else {
      return message.extracted_data?.amount || null
    }
  }

  const getMessagePhone = (message: SmsLog | FcmLog): string | null => {
    if (isFcmLog(message)) {
      return message.data?.wave_payment_data?.phone || null
    } else {
      return message.extracted_data?.phone || null
    }
  }

  const getMessageSenderName = (message: SmsLog | FcmLog): string | null => {
    if (isFcmLog(message)) {
      return message.data?.wave_payment_data?.sender_name || null
    } else {
      return null // SMS logs don't have sender_name in ExtractedData
    }
  }

  const formatDateTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd MMM yyyy, HH:mm")
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
      case "no_order":
        return <XCircle className="h-4 w-4 text-orange-600" />
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
      case "no_order":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">{statusDisplay}</Badge>
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{statusDisplay}</Badge>
    }
  }

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    
    // Check if user has scrolled to within 100px of the bottom
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (hasNextPage && !isLoadingMore && onLoadMore) {
        onLoadMore()
      }
    }
  }, [hasNextPage, isLoadingMore, onLoadMore])

  if (!sender) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Sélectionnez un expéditeur</h3>
            <p className="text-sm text-gray-600 mt-1">Choisissez un expéditeur dans la barre latérale pour voir ses messages</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col bg-background">
        <div className="border-b border-border bg-blue-600 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-semibold text-white">{sender}</h2>
          </div>
        </div>
        
        <ScrollArea className="p-6" style={{ height: 'calc(100vh - 300px)' }}>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <h2 className="font-semibold text-white">{sender}</h2>
          </div>
          {/* <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/20">
            {messages.length} message{messages.length !== 1 ? "s" : ""} chargé{messages.length !== 1 ? "s" : ""}
          </Badge> */}
        </div>
      </div>

      <ScrollArea 
        ref={scrollAreaRef}
        className="p-6" 
        style={{ height: 'calc(100vh - 200px)' }}
        onScrollCapture={handleScroll}
      >
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.uid} className="mb-8 flex justify-center">
              {/* Message Bubble */}
              <div className="relative w-full max-w-lg lg:max-w-4xl">
                <div 
                  className="bg-gray-200 rounded-2xl rounded-bl-md p-6 shadow-sm cursor-pointer hover:bg-gray-300 transition-colors w-full"
                  onClick={() => handleMessageClick(message)}
                >
                  {/* Title for FCM logs */}
                  {isFcmLog(message) && message.title && (
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-800 border-b border-gray-300 pb-2">
                        {message.title}
                      </h3>
                    </div>
                  )}
                  
                  {/* Message Content */}
                  <div className="text-sm text-gray-900 leading-relaxed break-words whitespace-pre-wrap">
                    {isFcmLog(message) ? message.body : message.content}
                  </div>
                  
                  {/* Extracted Data */}
                  {(getMessageAmount(message) || getMessagePhone(message) || getMessageSenderName(message)) && (
                    <div className="mt-3 space-y-2">
                      {getMessageAmount(message) && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <DollarSign className="h-3 w-3" />
                          <span>Montant: {getMessageAmount(message)} FCFA</span>
                        </div>
                      )}
                      {getMessagePhone(message) && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span>Téléphone: {getMessagePhone(message)}</span>
                        </div>
                      )}
                      {getMessageSenderName(message) && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="h-3 w-3" />
                          <span>Expéditeur: {getMessageSenderName(message)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status and Time - Bottom Right */}
                  <div className="flex justify-end items-center gap-2 mt-4">
                    <span className="text-xs text-gray-500">{formatDateTime(isFcmLog(message) ? message.created_at : message.received_at)}</span>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(message.status)}
                      <span className="text-xs font-medium text-gray-600">{message.status_display}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 400px)' }}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun message trouvé</h3>
                <p className="text-sm text-gray-600">Aucun message disponible pour cet expéditeur</p>
              </div>
            </div>
          )}

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement de plus de messages...</span>
              </div>
            </div>
          )}

          {/* End of messages indicator */}
          {!hasNextPage && messages.length > 0 && !isLoadingMore && (
            <div className="flex justify-center py-4">
              <div className="text-center text-gray-500">
                <span className="text-sm">Tous les messages ont été chargés</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Status Selection Modal */}
      <StatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={selectedMessage}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdating}
      />
    </div>
  )
}