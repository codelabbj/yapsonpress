"use client"

import { SenderSidebar } from "@/components/sender-sidebar"
import { MessageThread } from "@/components/message-thread"
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
import { useState, useCallback, useEffect } from "react"
import useSWR from "swr"

export default function DashboardPage() {
  const { logout } = useAuth()
  const [selectedSender, setSelectedSender] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isUpdating, setIsUpdating] = useState(false)
  const [allMessages, setAllMessages] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaveMode, setIsWaveMode] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

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
  const {
    data: messagesData,
    isLoading: messagesLoading,
    mutate: mutateMessages,
  } = useSWR(
    selectedSender ? ["messages", selectedSender, searchQuery, statusFilter, isWaveMode] : null,
    async () => {
      console.log("🔄 SWR messages fetcher called with:", { selectedSender, isWaveMode, searchQuery, statusFilter })
      if (isWaveMode) {
        console.log("🌊 Wave mode detected - calling fetchFcmLogs")
        return await fetchFcmLogs({
          package_name: selectedSender || undefined,
          search: searchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        })
      } else {
        console.log("📱 SMS mode detected - calling fetchSmsLogs")
        return await fetchSmsLogs({
          sender: selectedSender || undefined,
          search: searchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          ordering: "-created_at",
          page: 1,
          page_size: 20,
        })
      }
    },
    {
      refreshInterval: 0, // Disable automatic refresh
      dedupingInterval: 2000, // Prevent duplicate requests within 2 seconds
      revalidateOnFocus: false, // Prevent revalidation on window focus
      revalidateOnReconnect: false, // Disable revalidation on network reconnect
      errorRetryCount: 3, // Limit retry attempts
      errorRetryInterval: 5000, // Wait 5 seconds between retries
    },
  )

  // Handle messages data updates separately to avoid re-render loops
  useEffect(() => {
    if (messagesData) {
      setAllMessages(messagesData.results)
      setCurrentPage(1)
      setHasNextPage(!!messagesData.next)
    }
  }, [messagesData])

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
      // Actualiser les données
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
    if (!hasNextPage || isLoadingMore || !selectedSender) return

    setIsLoadingMore(true)
    setError(null)
    try {
      const nextPage = currentPage + 1
      let data: SmsLogsResponse | FcmLogsResponse
      
      if (isWaveMode) {
        data = await fetchFcmLogs({
          package_name: selectedSender || undefined,
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

      // Prevent duplicates by filtering out messages that already exist
      setAllMessages(prev => {
        const existingIds = new Set(prev.map(msg => msg.uid))
        const newMessages = data.results.filter(msg => !existingIds.has(msg.uid))
        return [...prev, ...newMessages]
      })
      
      setCurrentPage(nextPage)
      
      // If no new messages were added or no next page, stop loading
      const existingIds = new Set(allMessages.map(msg => msg.uid))
      const newMessages = data.results.filter(msg => !existingIds.has(msg.uid))
      
      if (newMessages.length === 0 || !data.next) {
        setHasNextPage(false)
      } else {
        setHasNextPage(!!data.next)
      }
    } catch (error) {
      console.error("Erreur lors du chargement de plus de messages:", error)
      
      // Extract error message from backend response
      let errorMessage = "Erreur lors du chargement des messages. Veuillez réessayer."
      
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
        } else if (errorObj.message) {
          errorMessage = errorObj.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasNextPage, isLoadingMore, selectedSender, currentPage, searchQuery, statusFilter, allMessages, isWaveMode])

  // Reset messages when sender changes
  const handleSelectSender = useCallback((sender: string | null, waveMode: boolean = false) => {
    console.log("🎯 handleSelectSender called with:", { sender, waveMode })
    
    // Only reset messages if the sender or wave mode actually changed
    const senderChanged = selectedSender !== sender
    const waveModeChanged = isWaveMode !== waveMode
    
    if (senderChanged || waveModeChanged) {
      setAllMessages([])
      setCurrentPage(1)
      setHasNextPage(false)
      setIsLoadingMore(false)
    }
    
    setSelectedSender(sender)
    setIsWaveMode(waveMode)
  }, [selectedSender, isWaveMode])

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
              <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
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
              />
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {selectedSender && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => handleSelectSender(null)}>
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <SenderSidebar
                senders={senders || []}
                selectedSender={selectedSender}
                onSelectSender={handleSelectSender}
                isLoading={sendersLoading}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
