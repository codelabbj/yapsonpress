"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { UniqueSender } from "@/lib/api"
import { MessageSquare, Users } from "lucide-react"

interface SenderSidebarProps {
  senders: UniqueSender[]
  selectedSender: string | null
  onSelectSender: (sender: string) => void
  isLoading?: boolean
}

export function SenderSidebar({ senders, selectedSender, onSelectSender, isLoading }: SenderSidebarProps) {
  const getInitials = (sender: string) => {
    if (sender.startsWith("+")) {
      return sender.slice(1, 4)
    }
    return sender.slice(0, 2).toUpperCase()
  }

  const getSenderType = (sender: string) => {
    if (sender.startsWith("+")) return "phone"
    if (sender.includes("Money") || sender.includes("MoMo") || sender.includes("Orange")) return "service"
    return "other"
  }

  const getSenderIcon = (sender: string) => {
    const type = getSenderType(sender)
    switch (type) {
      case "phone":
        return "📱"
      case "service":
        return "🏦"
      default:
        return "📧"
    }
  }

  if (isLoading) {
    return (
      <div className="w-80 border-r border-border bg-background">
        <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-white" />
            <h2 className="font-semibold text-white">Expéditeurs</h2>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-border bg-background">
      <div className="border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-white" />
            <h2 className="font-semibold text-white">Expéditeurs</h2>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/20">
            {senders.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-4 space-y-2">
          {senders.map((sender) => (
            <button
              key={sender.sender}
              onClick={() => onSelectSender(sender.sender)}
              className={cn(
                "flex w-full items-center gap-3 p-3 text-left transition-all duration-200 rounded-lg hover:bg-blue-50 hover:shadow-sm",
                selectedSender === sender.sender && "bg-blue-100 shadow-sm border border-blue-200"
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={cn(
                    "text-sm font-semibold",
                    selectedSender === sender.sender 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 text-gray-700"
                  )}>
                    {getInitials(sender.sender)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs">
                  {getSenderIcon(sender.sender)}
                </div>
                {sender.count > 0 && (
                  <Badge
                    className={cn(
                      "absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs font-semibold",
                      selectedSender === sender.sender 
                        ? "bg-blue-600 text-white" 
                        : "bg-blue-500 text-white"
                    )}
                  >
                    {sender.count}
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <p className={cn(
                    "truncate font-medium",
                    selectedSender === sender.sender ? "text-blue-900" : "text-gray-900"
                  )}>
                    {sender.sender}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MessageSquare className="h-3 w-3" />
                  <span>{sender.count} message{sender.count !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </button>
          ))}

          {senders.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun expéditeur</h3>
              <p className="text-sm text-gray-600">Aucun expéditeur trouvé</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}