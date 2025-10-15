"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { SmsLog } from "@/lib/api"
import { format } from "date-fns"
import { CheckCircle2, Clock, XCircle, Phone, DollarSign, Calendar, User } from "lucide-react"

interface MessageThreadProps {
  messages: SmsLog[]
  sender: string | null
  onUpdateStatus: (uid: string, status: "pending" | "approved" | "rejected") => void
  isLoading?: boolean
  isUpdating?: boolean
}

export function MessageThread({ messages, sender, onUpdateStatus, isLoading, isUpdating }: MessageThreadProps) {
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
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: string, statusDisplay: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{statusDisplay}</Badge>
      case "rejected":
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">{statusDisplay}</Badge>
      default:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{statusDisplay}</Badge>
    }
  }

  if (!sender) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
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
        <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex-shrink-0">
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
          <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/20">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      <ScrollArea className="p-6" style={{ height: 'calc(100vh - 300px)' }}>
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.uid} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Message Content */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm leading-relaxed text-gray-900">{message.content}</p>
                  </div>

                  {/* Extracted Data */}
                  {message.extracted_data?.amount && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-green-600 font-medium">Montant</p>
                          <p className="text-sm font-semibold text-green-800">{message.extracted_data.amount} FCFA</p>
                        </div>
                      </div>
                      {message.extracted_data?.phone && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <div>
                            <p className="text-xs text-blue-600 font-medium">Téléphone</p>
                            <p className="text-sm font-semibold text-blue-800">{message.extracted_data.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDateTime(message.received_at)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(message.status)}
                        {getStatusBadge(message.status, message.status_display)}
                      </div>

                      {message.status !== "approved" && message.can_change_status && (
                        <Button
                          size="sm"
                          className="h-8 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => onUpdateStatus(message.uid, "approved")}
                          disabled={isUpdating}
                        >
                          {isUpdating ? "..." : "APPROUVER"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {messages.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun message trouvé</h3>
              <p className="text-sm text-gray-600">Aucun message disponible pour cet expéditeur</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}