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
} from "@/lib/api"
import { useState } from "react"
import useSWR from "swr"

export default function DashboardPage() {
  const { logout } = useAuth()
  const [selectedSender, setSelectedSender] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isUpdating, setIsUpdating] = useState(false)

  // Récupérer les expéditeurs uniques
  const {
    data: senders,
    isLoading: sendersLoading,
    mutate: mutateSenders,
  } = useSWR<UniqueSender[]>("senders", fetchUniqueSenders, {
    refreshInterval: 60000, // Actualisation automatique toutes les 60 secondes
  })

  // Récupérer les statistiques
  const {
    data: stats,
    isLoading: statsLoading,
    mutate: mutateStats,
  } = useSWR<SmsStats>("stats", fetchSmsStats, {
    refreshInterval: 60000,
  })

  // Récupérer les messages pour l'expéditeur sélectionné
  const {
    data: messagesData,
    isLoading: messagesLoading,
    mutate: mutateMessages,
  } = useSWR(
    selectedSender ? ["messages", selectedSender, searchQuery, statusFilter] : null,
    () =>
      fetchSmsLogs({
        sender: selectedSender || undefined,
        search: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        ordering: "-created_at",
      }),
    {
      refreshInterval: 60000,
    },
  )

  const handleUpdateStatus = async (uid: string, status: "pending" | "approved" | "rejected") => {
    setIsUpdating(true)
    try {
      await updateSmsStatus(uid, status)
      // Actualiser les données
      mutateMessages()
      mutateStats()
      mutateSenders()
      
      // Show success feedback
      console.log(`Message ${uid} status updated to ${status}`)
    } catch (error) {
      console.error("Échec de la mise à jour du statut:", error)
      // Show error feedback
      alert("Erreur lors de la mise à jour du statut. Veuillez réessayer.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRefresh = () => {
    mutateSenders()
    mutateStats()
    mutateMessages()
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen flex-col bg-gray-50">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={handleRefresh}
          isRefreshing={sendersLoading || messagesLoading}
          onLogout={logout}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block">
            <SenderSidebar
              senders={senders || []}
              selectedSender={selectedSender}
              onSelectSender={setSelectedSender}
              isLoading={sendersLoading}
            />
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Stats Section */}
            <div className="border-b border-border bg-white p-4 lg:p-6 shadow-sm">
              <StatsCards stats={stats || null} isLoading={statsLoading} />
            </div>

            {/* Messages Section */}
            <div className="flex-1 min-h-0">
              <MessageThread
                messages={messagesData?.results || []}
                sender={selectedSender}
                onUpdateStatus={handleUpdateStatus}
                isLoading={messagesLoading}
                isUpdating={isUpdating}
              />
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {selectedSender && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSelectedSender(null)}>
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <SenderSidebar
                senders={senders || []}
                selectedSender={selectedSender}
                onSelectSender={setSelectedSender}
                isLoading={sendersLoading}
              />
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
