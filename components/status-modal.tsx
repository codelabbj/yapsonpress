"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react"
import type { SmsLog } from "@/lib/api"
import type { FcmLog } from "@/lib/fcm-api"

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
  message: (SmsLog | FcmLog) | null
  onStatusChange: (uid: string, status: "approved" | "no_order") => void
  isUpdating?: boolean
}

export function StatusModal({ isOpen, onClose, message, onStatusChange, isUpdating }: StatusModalProps) {
  if (!message) return null

  const handleStatusSelect = (status: "approved" | "no_order") => {
    onStatusChange(message.uid, status)
    onClose()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "no_order":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "no_order":
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "Approuver"
      case "no_order":
        return "Pas de commande"
      case "no_order":
        return "Pas de commande"
      default:
        return "En attente"
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "approved":
        return "Marquer cette transaction comme approuvée"
      case "no_order":
        return "Indiquer qu'il n'y a pas de commande associée"
      case "no_order":
        return "Indiquer qu'il n'y a pas de commande associée"
      default:
        return "Laisser en statut d'attente"
    }
  }

  return (
    <>
      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Changer le statut du message</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez le nouveau statut pour ce message SMS
              </p>

              <div className="space-y-3 bg-white">
                {/* Message Preview */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 line-clamp-3">{message.content}</p>
                  {message.extracted_data?.amount && (
                    <div className="mt-2 text-xs text-gray-600">
                      Montant: {message.extracted_data.amount} FCFA
                    </div>
                  )}
                </div>

                {/* Status Options */}
                <div className="space-y-2">
                  {/* Approve */}
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => handleStatusSelect("approved")}
                    disabled={isUpdating}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon("approved")}
                      <div className="text-left">
                        <div className="font-medium">{getStatusLabel("approved")}</div>
                        <div className="text-xs text-gray-500">{getStatusDescription("approved")}</div>
                      </div>
                    </div>
                  </Button>

                  {/* No Transaction */}
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => handleStatusSelect("no_order")}
                    disabled={isUpdating}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon("no_order")}
                      <div className="text-left">
                        <div className="font-medium">{getStatusLabel("no_order")}</div>
                        <div className="text-xs text-gray-500">{getStatusDescription("no_order")}</div>
                      </div>
                    </div>
                  </Button>
                </div>

                {/* Cancel Button */}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={onClose}
                  disabled={isUpdating}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
