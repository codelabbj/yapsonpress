"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search, Trash2, LogOut } from "lucide-react"

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
  return (
    <div className="flex items-center gap-3 border-b border-border bg-teal-600 px-6 py-3">
      <h1 className="text-lg font-semibold text-white mr-4">YapsonPress</h1>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher des messages..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-40 bg-white">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="PENDING">En attente</SelectItem>
          <SelectItem value="APPROVED">Approuvé</SelectItem>
          <SelectItem value="REJECTED">Rejeté</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="bg-white">
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      </Button>

      <Button variant="outline" size="icon" className="bg-white">
        <Trash2 className="h-4 w-4" />
      </Button>

      {onLogout && (
        <Button variant="outline" size="icon" onClick={onLogout} className="bg-white" title="Déconnexion">
          <LogOut className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
