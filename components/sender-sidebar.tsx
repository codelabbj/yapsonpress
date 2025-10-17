"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { UniqueSender } from "@/lib/api"
import type { UniquePackage } from "@/lib/fcm-api"
import { MessageSquare, Users, Smartphone, Pin, PinOff } from "lucide-react"

interface SenderSidebarProps {
  senders: UniqueSender[]
  selectedSender: string | null
  onSelectSender: (sender: string | null, waveMode?: boolean) => void
  isLoading?: boolean
  wavePackages?: UniquePackage[]
  wavePackagesLoading?: boolean
  pinnedSenders?: Set<string>
  onPinSender?: (sender: string) => void
  onUnpinSender?: (sender: string) => void
  isPinning?: boolean
}

export function SenderSidebar({ 
  senders, 
  selectedSender, 
  onSelectSender, 
  isLoading, 
  wavePackages = [], 
  wavePackagesLoading = false,
  pinnedSenders = new Set(),
  onPinSender,
  onUnpinSender,
  isPinning = false
}: SenderSidebarProps) {
  // Debug logging
  console.log("SenderSidebar - wavePackages:", wavePackages)
  console.log("SenderSidebar - wavePackagesLoading:", wavePackagesLoading)
  console.log("SenderSidebar - wavePackages.length:", wavePackages?.length)

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
        <div className="border-b border-border bg-blue-600 px-4 py-4">
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
          {/* Wave Packages Section */}
          {(wavePackages && wavePackages.length > 0) || wavePackagesLoading ? (
            <>
              <div className="px-2 py-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <Smartphone className="h-3 w-3" />
                  Wave
                </div>
              </div>
              {wavePackagesLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Chargement des packages Wave...</span>
                </div>
              ) : wavePackages && wavePackages.length > 0 ? (
                wavePackages.map((pkg) => (
                  <button
                    key={`wave-${pkg.package_name}`}
                    onClick={() => onSelectSender("com.wave.business", true)}
                    className={cn(
                      "flex w-full items-center gap-3 p-4 text-left transition-all duration-200 border-b border-gray-100 last:border-b-0",
                      selectedSender === "com.wave.business" && "bg-blue-600 text-white"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={cn(
                          "text-sm font-semibold bg-green-200 text-green-700",
                          selectedSender === "com.wave.business" && "bg-white text-blue-600"
                        )}>
                          W
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs">
                        📱
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "truncate font-medium text-sm",
                          selectedSender === "com.wave.business" ? "text-white" : "text-gray-900"
                        )}>
                          {pkg.package_name}
                        </p>
                        {pkg.unread_count > 0 && (
                          <Badge
                            className={cn(
                              "h-5 min-w-5 rounded-full px-1 text-xs font-semibold bg-red-500 text-white",
                              selectedSender === "com.wave.business" && "bg-red-400"
                            )}
                          >
                            {pkg.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs mt-1",
                        selectedSender === "com.wave.business" ? "text-white/70" : "text-gray-500"
                      )}>
                        {pkg.count} message{pkg.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </button>
                ))
              ) : null}
            </>
          ) : null}

          {/* SMS Section */}
          <div className="px-2 py-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <MessageSquare className="h-3 w-3" />
              SMS
            </div>
          </div>

          {/* SMS Senders - Sort pinned senders first */}
          {senders
            .sort((a, b) => {
              const aPinned = pinnedSenders.has(a.sender)
              const bPinned = pinnedSenders.has(b.sender)
              if (aPinned && !bPinned) return -1
              if (!aPinned && bPinned) return 1
              return 0
            })
            .map((sender) => {
            const isPinned = pinnedSenders.has(sender.sender)
            return (
              <div
                key={sender.sender}
                className={cn(
                  "flex items-center gap-3 p-4 transition-all duration-200 border-b border-gray-100 last:border-b-0",
                  selectedSender === sender.sender && "bg-blue-600 text-white"
                )}
              >
                <button
                  onClick={() => onSelectSender(sender.sender, false)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={cn(
                        "text-sm font-semibold bg-gray-200 text-gray-700",
                        selectedSender === sender.sender && "bg-white text-blue-600"
                      )}>
                        {getInitials(sender.sender)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-xs">
                      {getSenderIcon(sender.sender)}
                    </div>
                    {isPinned && (
                      <div className="absolute -top-1 -left-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <Pin className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        "truncate font-medium text-sm",
                        selectedSender === sender.sender ? "text-white" : "text-gray-900"
                      )}>
                        {sender.sender}
                      </p>
                      {sender.unread_count > 0 && (
                        <Badge
                          className={cn(
                            "h-5 min-w-5 rounded-full px-1 text-xs font-semibold bg-red-500 text-white",
                            selectedSender === sender.sender && "bg-red-400"
                          )}
                        >
                          {sender.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-1",
                      selectedSender === sender.sender ? "text-white/70" : "text-gray-500"
                    )}>
                      {sender.count} message{sender.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>

                {/* Pin/Unpin Button */}
                {onPinSender && onUnpinSender && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isPinned) {
                        onUnpinSender(sender.sender)
                      } else {
                        onPinSender(sender.sender)
                      }
                    }}
                    disabled={isPinning}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      isPinned 
                        ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" 
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                      selectedSender === sender.sender && "hover:bg-white/20"
                    )}
                    title={isPinned ? "Désépingler" : "Épingler"}
                  >
                    {isPinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )
          })}

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