"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Search, Trash2, LogOut, Filter, Bell, Menu } from "lucide-react"

interface TopBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
  onLogout?: () => void
  onMenuClick?: () => void
}

export function TopBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isRefreshing,
  onLogout,
  onMenuClick,
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
    <div className="flex flex-col border-b border-border bg-blue-600 shadow-lg">
      {/* Top Row: Logo, Menu, Actions */}
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:px-8 lg:py-4 lg:gap-6">
        {/* Menu Button (Mobile only) */}
        {onMenuClick && (
          <Button
            variant="outline"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden h-9 w-9 bg-white/10 hover:bg-white/20 border-white/20 text-white"
            title="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo and Title */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm sm:text-base lg:text-lg">YP</span>
          </div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">YapsonPress</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto lg:gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onRefresh} 
            disabled={isRefreshing} 
            className={`h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14 bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200 ${
              isRefreshing ? "opacity-75 cursor-not-allowed" : ""
            }`}
            title={isRefreshing ? "Actualisation en cours..." : "Actualiser"}
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200 lg:h-5 lg:w-5 xl:h-6 xl:w-6 ${
              isRefreshing ? "animate-spin" : ""
            }`} />
          </Button>

          {onLogout && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onLogout} 
              className="h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 xl:h-14 xl:w-14 bg-white/10 hover:bg-white/20 border-white/20 text-white" 
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4 sm:h-4 sm:w-4 lg:h-4 lg:w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom Row: Search and Filter (Mobile stacked) */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-8 lg:pb-5 lg:gap-6 lg:items-center">
        {/* Search Bar */}
        <div className="relative flex-1 w-full sm:max-w-md lg:max-w-2xl xl:max-w-3xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher des messages..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 sm:pl-12 h-10 sm:h-11 lg:h-12 xl:h-14 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200 text-sm sm:text-base lg:text-lg"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Filter className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-white/80 hidden sm:block" />
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-48 lg:w-56 xl:w-64 h-10 sm:h-11 lg:h-14 xl:h-16 bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200">
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
                  <span>Pas de commande</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {statusFilter !== "all" && (
            <Badge className={getStatusBadgeColor(statusFilter)}>
              <span className="hidden sm:inline">{getStatusLabel(statusFilter)}</span>
              <span className="sm:hidden text-xs">{getStatusLabel(statusFilter).split(' ')[0]}</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}