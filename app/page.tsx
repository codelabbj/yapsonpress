"use client"

import { SenderSidebar } from "@/components/sender-sidebar"
import { MessageThread } from "@/components/message-thread-v2"
import { TopBar } from "@/components/top-bar"
import { StatsCards } from "@/components/stats-cards"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchSmsLogs,
  fetchSmsStats,
  fetchUniqueSenders,
  updateSmsStatus,
  type SmsStats,
  type UniqueSender,
  type SmsLogsResponse,
} from "@/lib/api"
import {
  fetchFcmLogs,
  fetchUniquePackages,
  updateFcmStatus,
  type FcmLogsResponse,
  type UniquePackage,
} from "@/lib/fcm-api"
import {
  pinSender,
  unpinSender,
  fetchPinnedSenders,
  type PinSenderResponse,
  type UnpinSenderResponse,
  type PinnedSendersResponse,
  type PinnedSender,
} from "@/lib/pin-api"
import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { useMessagesV2 } from "@/hooks/use-messages-v2"
import { useConversationStore } from "@/hooks/use-conversation-store"

export default function DashboardPage() {
  const { logout } = useAuth()
  const [selectedSender, setSelectedSender] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaveMode, setIsWaveMode] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [useCacheOnly, setUseCacheOnly] = useState(false)
  const [restoreScrollTop, setRestoreScrollTop] = useState(0)
  const currentScrollTopRef = useRef(0)

  // Hook V2 - Architecture stable pour gérer les messages
  const {
    messages: allMessages,
    addMessages,
    updateMessage,
    clearMessages,
    newMessageIds,
    markMessagesAsRead,
    getMessagesMap,
    getOrderArray,
    restoreState,
  } = useMessagesV2({
    onNewMessages: (newMessages) => {
      console.log(`✨ ${newMessages.length} nouveau(x) message(s) détecté(s)`)
    },
  })

  // Store Zustand pour garder l'état de chaque conversation
  const saveConversation = useConversationStore(state => state.saveConversation)
  const loadConversation = useConversationStore(state => state.loadConversation)

  // Récupérer les expéditeurs uniques
  const {
    data: senders,
    isLoading: sendersLoading,
    mutate: mutateSenders,
  } = useSWR<UniqueSender[]>("senders", fetchUniqueSenders, {
    refreshInterval: 60000, // Actualisation automatique toutes les 60 secondes
  })

  // Récupérer les packages Wave
  const {
    data: wavePackages,
    isLoading: wavePackagesLoading,
    mutate: mutateWavePackages,
  } = useSWR<UniquePackage[]>("wave-packages", fetchUniquePackages, {
    refreshInterval: 60000,
    onSuccess: (data) => {
      console.log("🌊 Wave packages fetched successfully:", data)
    },
    onError: (error) => {
      console.error("❌ Error fetching Wave packages:", error)
    }
  })

  // Debug logging for Wave packages
  console.log("Main page - wavePackages:", wavePackages)
  console.log("Main page - wavePackagesLoading:", wavePackagesLoading)

  // Récupérer les expéditeurs épinglés
  const {
    data: pinnedSendersData,
    isLoading: pinnedSendersLoading,
    mutate: mutatePinnedSenders,
  } = useSWR<PinnedSendersResponse>("pinned-senders", fetchPinnedSenders, {
    refreshInterval: 60000,
  })

  // Derived state for pinned senders from API data
  const pinnedSenders = new Set<string>(pinnedSendersData?.pinned_senders?.map((p: PinnedSender) => p.sender) || [])

  // Récupérer les statistiques
  const {
    data: stats,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR<SmsStats>("stats", fetchSmsStats, {
    refreshInterval: 60000,
  })
  // Architecture Google Messages : Cache intelligent par conversation
  const {
    data: messagesData,
    isLoading: messagesLoading,
    mutate: mutateMessages,
  } = useSWR(
    // Clé unique par conversation (pas par page)
    selectedSender ? `messages-${isWaveMode ? 'wave' : 'sms'}-${selectedSender}-${searchQuery}-${statusFilter}` : null,
    async () => {
      if (!selectedSender) return null
      console.log("🔄 SWR fetching page 1 for:", selectedSender)
      
      if (isWaveMode) {
        return await fetchFcmLogs({
          package_name: selectedSender,
          search: searchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        })
      } else {
        return await fetchSmsLogs({
          sender: selectedSender,
          search: searchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        })
      }
    },
    {
      // CLÉS PRO : Désactiver refresh si on a paginé ou si on restaure depuis cache
      refreshInterval: currentPage === 1 && !useCacheOnly ? 60000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: !useCacheOnly,
      revalidateOnMount: !useCacheOnly,
      revalidateIfStale: !useCacheOnly,
      dedupingInterval: 30000,
      onSuccess: (data: SmsLogsResponse | FcmLogsResponse | null) => {
        if (data) {
          // Remplacer UNIQUEMENT si on est sur la page 1
          if (currentPage === 1) {
            console.log("📥 Loading page 1:", data.results.length, "messages")
            clearMessages()
            addMessages(data.results, 'top') // Nouveaux messages en haut
          }
          setHasNextPage(!!data.next)
        }
      },
    },
  )

  const handleUpdateStatus = async (uid: string, status: "approved" | "no_order") => {
    setIsUpdating(true)
    setError(null)
    try {
      if (isWaveMode) {
        await updateFcmStatus(uid, status)
        mutateWavePackages()
      } else {
        await updateSmsStatus(uid, status)
        mutateSenders()
      }
      // Mettre à jour le message localement immédiatement pour un feedback instantané
      const message = allMessages.find(m => m.uid === uid)
      if (message) {
        updateMessage(uid, {
          status: status,
          status_display: status === "approved" ? "Approuvé" : "Pas de commande"
        })
      }
      
      // Actualiser les données depuis le serveur
      mutateMessages()
      mutateStats()
      
      // Show success feedback
      console.log(`Message ${uid} status updated to ${status}`)
    } catch (error) {
      console.error("Échec de la mise à jour du statut:", error)
      
      // Extract error message from backend response
      let errorMessage = "Erreur lors de la mise à jour du statut. Veuillez réessayer."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        // Try to extract error from API response
        const errorObj = error as any
        if (errorObj.response?.data?.status && Array.isArray(errorObj.response.data.status)) {
          errorMessage = errorObj.response.data.status[0]
        } else if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message
        } else if (errorObj.response?.data?.error) {
          errorMessage = errorObj.response.data.error
        } else if (errorObj.message) {
          errorMessage = errorObj.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    mutateSenders()
    mutateStats()
    mutateMessages()
    mutateWavePackages()
    mutatePinnedSenders()
    
    // Reset refreshing state after a short delay to show the animation
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  const handlePinSender = async (sender: string) => {
    setIsPinning(true)
    setError(null)
    try {
      const response = await pinSender(sender)
      mutatePinnedSenders()
      console.log("Sender pinned successfully:", response.message)
    } catch (error) {
      console.error("Failed to pin sender:", error)
      
      // Extract error message from backend response
      let errorMessage = "Erreur lors de l'épinglage de l'expéditeur. Veuillez réessayer."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any
        if (errorObj.response?.data?.sender && Array.isArray(errorObj.response.data.sender)) {
          errorMessage = errorObj.response.data.sender[0]
        } else if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message
        } else if (errorObj.response?.data?.error) {
          errorMessage = errorObj.response.data.error
        } else if (errorObj.message) {
          errorMessage = errorObj.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsPinning(false)
    }
  }

  const handleUnpinSender = async (sender: string) => {
    setIsPinning(true)
    setError(null)
    try {
      const response = await unpinSender(sender)
      mutatePinnedSenders()
      console.log("Sender unpinned successfully:", response.message)
    } catch (error) {
      console.error("Failed to unpin sender:", error)
      
      // Extract error message from backend response
      let errorMessage = "Erreur lors du désépinglage de l'expéditeur. Veuillez réessayer."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any
        if (errorObj.response?.data?.sender && Array.isArray(errorObj.response.data.sender)) {
          errorMessage = errorObj.response.data.sender[0]
        } else if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message
        } else if (errorObj.response?.data?.error) {
          errorMessage = errorObj.response.data.error
        } else if (errorObj.message) {
          errorMessage = errorObj.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsPinning(false)
    }
  }

  const handleLoadMore = useCallback(async () => {
    // Protection stricte contre les appels multiples
    if (!hasNextPage || isLoadingMore || !selectedSender) {
      console.log("⛔ LoadMore bloqué:", { hasNextPage, isLoadingMore, selectedSender })
      return
    }

    console.log(`📥 Chargement page ${currentPage + 1}...`)
    setIsLoadingMore(true)
    setError(null)
    
    try {
      const nextPage = currentPage + 1
      let data: SmsLogsResponse | FcmLogsResponse
      
      if (isWaveMode) {
        data = await fetchFcmLogs({
          package_name: selectedSender,
          search: searchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: nextPage,
          page_size: 20,
        })
      } else {
        data = await fetchSmsLogs({
          sender: selectedSender,
          search: searchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: nextPage,
          page_size: 20,
        })
      }

      console.log(`✅ Page ${nextPage} chargée:`, data.results.length, "messages")
      
      // Ajouter les messages de la pagination EN BAS (scroll infini)
      addMessages(data.results, 'bottom')
      
      // Mettre à jour l'état de pagination
      setCurrentPage(nextPage)
      setHasNextPage(!!data.next)
      
    } catch (error) {
      console.error("❌ Erreur chargement page:", error)
      
      let errorMessage = "Erreur lors du chargement des messages."
      
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any
        if (errorObj.response?.data?.status && Array.isArray(errorObj.response.data.status)) {
          errorMessage = errorObj.response.data.status[0]
        } else if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message
        } else if (errorObj.response?.data?.error) {
          errorMessage = errorObj.response.data.error
        }
      }
      
      setError(errorMessage)
    } finally {
      // Délai de sécurité avant de permettre un nouveau chargement
      setTimeout(() => {
        setIsLoadingMore(false)
      }, 800)
    }
  }, [hasNextPage, isLoadingMore, selectedSender, currentPage, searchQuery, statusFilter, isWaveMode, addMessages])

  // Changement de conversation avec cache
  const handleSelectSender = useCallback((sender: string | null, waveMode: boolean = false) => {
    console.log("🎯 Changement de conversation:", { sender, waveMode })
    
    const senderChanged = selectedSender !== sender
    const waveModeChanged = isWaveMode !== waveMode
    
    if (senderChanged || waveModeChanged) {
      // 1. SAUVEGARDER l'état de la conversation actuelle
      if (selectedSender) {
        const currentKey = `${isWaveMode ? 'wave' : 'sms'}-${selectedSender}`
        const scrollPosition = currentScrollTopRef.current
        
        saveConversation(currentKey, {
          messages: allMessages,
          currentPage,
          hasNextPage,
          scrollPosition,
          messageMap: getMessagesMap(),
          orderArray: getOrderArray(),
        })
      }
      
      // 2. CHARGER l'état de la nouvelle conversation (si existe)
      if (sender) {
        const newKey = `${waveMode ? 'wave' : 'sms'}-${sender}`
        const cached = loadConversation(newKey)
        
        if (cached) {
          console.log("✅ Conversation trouvée en cache, restauration...")
          setUseCacheOnly(true)
          restoreState(cached.messageMap, cached.orderArray)
          setCurrentPage(cached.currentPage)
          setHasNextPage(cached.hasNextPage)
          setRestoreScrollTop(cached.scrollPosition)
          currentScrollTopRef.current = cached.scrollPosition
          
          console.log(`📜 Scroll à restaurer: ${cached.scrollPosition}px`)
        } else {
          console.log("❌ Pas de cache, nouvelle conversation")
          setUseCacheOnly(false)
          clearMessages()
          setCurrentPage(1)
          setHasNextPage(false)
          setRestoreScrollTop(0)
          currentScrollTopRef.current = 0
        }
      } else {
        setUseCacheOnly(false)
        clearMessages()
        setCurrentPage(1)
        setHasNextPage(false)
        setRestoreScrollTop(0)
        currentScrollTopRef.current = 0
      }
      
      setIsLoadingMore(false)
      setError(null)
    }
    
    setSelectedSender(sender)
    setIsWaveMode(waveMode)
    setIsMobileMenuOpen(false)
  }, [
    selectedSender,
    isWaveMode,
    allMessages,
    currentPage,
    hasNextPage,
    clearMessages,
    saveConversation,
    loadConversation,
    getMessagesMap,
    getOrderArray,
    restoreState,
  ])

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-gray-50">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onLogout={logout}
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block">
            <SenderSidebar
              senders={senders || []}
              selectedSender={selectedSender}
              onSelectSender={handleSelectSender}
              isLoading={sendersLoading}
              wavePackages={wavePackages || []}
              wavePackagesLoading={wavePackagesLoading}
              pinnedSenders={pinnedSenders}
              onPinSender={handlePinSender}
              onUnpinSender={handleUnpinSender}
              isPinning={isPinning}
            />
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 sm:p-4 m-2 sm:m-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-red-700 break-words">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-600 hover:text-red-500 underline"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Section - Commented out for now */}
            {/* <div className="border-b border-border bg-white p-4 lg:p-6 shadow-sm">
              <StatsCards stats={stats || null} isLoading={statsLoading} />
            </div> */}

            {/* Messages Section */}
            <div className="flex-1 min-h-0">
                <MessageThread
                key={selectedSender ? `${isWaveMode ? 'wave' : 'sms'}-${selectedSender}` : 'empty'}
                messages={allMessages}
                sender={selectedSender}
                onUpdateStatus={handleUpdateStatus}
                isLoading={messagesLoading}
                isUpdating={isUpdating}
                hasNextPage={hasNextPage}
                isLoadingMore={isLoadingMore}
                onLoadMore={handleLoadMore}
                currentPage={currentPage}
                isWaveMode={isWaveMode}
                newMessageIds={newMessageIds}
                onMarkAsRead={markMessagesAsRead}
                restoreScrollTop={restoreScrollTop}
                onScrollPositionChange={(pos) => {
                  currentScrollTopRef.current = pos
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-50 bg-black/50 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div 
              className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform"
              onClick={(e) => e.stopPropagation()}
            >
              <SenderSidebar
                senders={senders || []}
                selectedSender={selectedSender}
                onSelectSender={(sender, waveMode) => {
                  handleSelectSender(sender, waveMode)
                  setIsMobileMenuOpen(false)
                }}
                isLoading={sendersLoading}
                wavePackages={wavePackages || []}
                wavePackagesLoading={wavePackagesLoading}
                pinnedSenders={pinnedSenders}
                onPinSender={handlePinSender}
                onUnpinSender={handleUnpinSender}
                isPinning={isPinning}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
