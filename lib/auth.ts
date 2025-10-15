const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

export interface LoginPayload {
  identifier: string
  password: string
}

export interface User {
  uid: string
  email: string
  phone: string | null
  first_name: string
  last_name: string
  is_active: boolean
  email_verified: boolean
  phone_verified: boolean
  display_name: string
  is_verified: boolean
  contact_method: string
  created_at: string
  updated_at: string
  is_staff: boolean
  is_superuser: boolean
  is_partner: boolean
  can_process_ussd_transaction: boolean
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
  verification_status: {
    email_verified: boolean
    phone_verified: boolean
    needs_verification: boolean
  }
  login_info: {
    login_time: string
    client_ip: string
    contact_method: string
  }
}

export interface RefreshResponse {
  access: string
  refresh: string
}

const TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"
const USER_KEY = "user"

export function setTokens(access: string, refresh: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

export function getRefreshToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }
  return null
}

export function setUser(user: User) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function getUser(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem(USER_KEY)
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
  }
  return null
}

export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Login failed" }))
    throw new Error(error.detail || "Login failed")
  }

  const data: LoginResponse = await response.json()

  // Check if user is a partner
  if (!data.user.is_partner) {
    throw new Error("Access denied. Only partners are permitted to use this application.")
  }

  // Store tokens and user
  setTokens(data.access, data.refresh)
  setUser(data.user)

  return data
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error("No refresh token available")
  }

  const response = await fetch(`${BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  })

  if (!response.ok) {
    // Refresh token expired or invalid
    clearAuth()
    throw new Error("Session expired. Please login again.")
  }

  const data: RefreshResponse = await response.json()

  // Update tokens
  setTokens(data.access, data.refresh)

  return data.access
}

export function logout() {
  clearAuth()
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}
