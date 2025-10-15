"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  login as authLogin,
  logout as authLogout,
  getUser,
  isAuthenticated,
  refreshAccessToken,
  type User,
  type LoginPayload,
} from "@/lib/auth"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        const storedUser = getUser()
        setUser(storedUser)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (!isAuthenticated()) return

    // Refresh token every 25 minutes (assuming 30 min expiry)
    const refreshInterval = setInterval(
      async () => {
        try {
          await refreshAccessToken()
          console.log("[v0] Token refreshed successfully")
        } catch (error) {
          console.error("[v0] Token refresh failed:", error)
          // If refresh fails, logout user
          handleLogout()
        }
      },
      25 * 60 * 1000,
    ) // 25 minutes

    return () => clearInterval(refreshInterval)
  }, [user])

  const handleLogin = async (payload: LoginPayload) => {
    try {
      const response = await authLogin(payload)
      setUser(response.user)
      router.push("/")
    } catch (error) {
      throw error
    }
  }

  const handleLogout = () => {
    authLogout()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
