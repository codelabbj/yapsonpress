"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { UniqueSender } from "@/lib/api"

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

  if (isLoading) {
    return (
      <div className="w-80 border-r border-border bg-background">
        <div className="flex h-full items-center justify-center">
          <div className="text-sm text-muted-foreground">Chargement des expéditeurs...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-border bg-background">
      <div className="border-b border-border bg-primary px-4 py-3">
        <h2 className="font-semibold text-primary-foreground">MobileMoney</h2>
      </div>

      <ScrollArea className="h-[calc(100vh-60px)]">
        <div className="divide-y divide-border">
          {senders.map((sender) => (
            <button
              key={sender.sender}
              onClick={() => onSelectSender(sender.sender)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                selectedSender === sender.sender && "bg-accent",
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials(sender.sender)}</AvatarFallback>
                </Avatar>
                {sender.count > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
                  >
                    {sender.count}
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium text-foreground">{sender.sender}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sender.count} message{sender.count !== 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
