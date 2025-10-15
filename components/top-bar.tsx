"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Search, Trash2, LogOut, Filter, Bell } from "lucide-react"

interface TopBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
  onLogout?: () => void
}

export function TopBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isRefreshing,
  onLogout,
}: TopBarProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "approved":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente"
      case "approved":
        return "Approuvé"
      case "rejected":
        return "Rejeté"
      default:
        return "Tous les statuts"
    }
  }

  return (
    <div className="flex items-center gap-4 border-b border-border bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 shadow-lg">
      {/* Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">YP</span>
        </div>
        <h1 className="text-xl font-bold text-white">YapsonPress</h1>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher des messages..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
        />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-white/80" />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-44 bg-white border-gray-200 focus:border-blue-300">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg">
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>Tous les statuts</span>
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <span>En attente</span>
              </div>
            </SelectItem>
            <SelectItem value="approved">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span>Approuvé</span>
              </div>
            </SelectItem>
            <SelectItem value="rejected">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span>Rejeté</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {statusFilter !== "all" && (
          <Badge className={getStatusBadgeColor(statusFilter)}>
            {getStatusLabel(statusFilter)}
          </Badge>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRefresh} 
          disabled={isRefreshing} 
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
          title="Actualiser"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>

        {/* <Button 
          variant="outline" 
          size="icon" 
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <Button 
          variant="outline" 
          size="icon" 
          className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
          title="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </Button> */}

        {onLogout && (
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onLogout} 
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white" 
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}