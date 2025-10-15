"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { SmsLog } from "@/lib/api"
import { format } from "date-fns"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

interface MessageThreadProps {
  messages: SmsLog[]
  sender: string | null
  onUpdateStatus: (uid: string, status: "PENDING" | "APPROVED" | "REJECTED") => void
  isLoading?: boolean
  isUpdating?: boolean
}

export function MessageThread({ messages, sender, onUpdateStatus, isLoading, isUpdating }: MessageThreadProps) {
  const formatDateTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd MMM, HH:mm")
    } catch {
      return timestamp
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-warning" />
    }
  }

  if (!sender) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">Sélectionnez un expéditeur pour voir les messages</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Chargement des messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="border-b border-border bg-primary px-6 py-4">
        <h2 className="font-semibold text-primary-foreground">{sender}</h2>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.uid} className="p-4">
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground">{message.message}</p>

                {message.transaction_id && (
                  <p className="text-xs text-muted-foreground">ID Transaction: {message.transaction_id}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDateTime(message.created_at)}</span>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(message.status)}
                      <span className="text-xs font-medium">{message.status}</span>
                    </div>

                    {message.status !== "APPROVED" && (
                      <Button
                        size="sm"
                        className="h-7 bg-success hover:bg-success/90"
                        onClick={() => onUpdateStatus(message.uid, "APPROVED")}
                        disabled={isUpdating}
                      >
                        APPROUVE
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {messages.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Aucun message trouvé</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
