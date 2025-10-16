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
      case "no_order":
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
      case "no_order":
        return "Pas de commande"
      default:
        return "Tous les statuts"
    }
  }

  return (
    <div className="flex items-center gap-6 border-b border-border bg-blue-600 px-8 py-5 shadow-lg lg:px-12 lg:py-6 xl:px-16 xl:py-7">
      {/* Logo and Title */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">YP</span>
        </div>
        <h1 className="text-2xl font-bold text-white">YapsonPress</h1>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher des messages..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 h-12 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200 text-base lg:h-14 lg:text-lg"
        />
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-5 w-5 text-white/80" />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-56 h-12 bg-white border-gray-200 focus:border-blue-300 lg:w-64 lg:h-14">
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
            <SelectItem value="no_order">
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
      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRefresh} 
          disabled={isRefreshing} 
          className={`h-12 w-12 bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 lg:h-14 lg:w-14 ${
            isRefreshing ? "opacity-75 cursor-not-allowed" : ""
          }`}
          title={isRefreshing ? "Actualisation en cours..." : "Actualiser"}
        >
          <RefreshCw className={`h-5 w-5 transition-transform duration-200 lg:h-6 lg:w-6 ${
            isRefreshing ? "animate-spin" : ""
          }`} />
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