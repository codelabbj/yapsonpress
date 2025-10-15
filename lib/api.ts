import { getAccessToken, refreshAccessToken, logout } from "./auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken()

  if (!token) {
    logout()
    throw new Error("Not authenticated")
  }

  // Add authorization header
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  }

  let response = await fetch(url, { ...options, headers })

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    try {
      token = await refreshAccessToken()
      // Retry request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      // Refresh failed, logout user
      logout()
      throw new Error("Session expired. Please login again.")
    }
  }

  return response
}

export interface SmsLog {
  uid: string
  sender: string
  message: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  created_at: string
  device_uid?: string
  transaction_id?: string
  amount?: string
  balance?: string
}

export interface SmsLogsResponse {
  count: number
  next: string | null
  previous: string | null
  results: SmsLog[]
}

export interface SmsStats {
  total_messages: number
  pending_count: number
  approved_count: number
  rejected_count: number
  total_amount?: number
}

export interface SenderStat {
  sender: string
  count: number
}

export interface UniqueSendersResponse {
  senders: string[]
  total: number
  stats: SenderStat[]
}

export interface UniqueSender {
  sender: string
  count: number
}

export async function fetchSmsLogs(params: {
  page?: number
  page_size?: number
  status?: string
  device_uid?: string
  search?: string
  ordering?: string
  date_from?: string
  date_to?: string
  sender?: string
}): Promise<SmsLogsResponse> {
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value.toString())
    }
  })

  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/?${queryParams.toString()}`)

  if (!response.ok) {
    throw new Error("Failed to fetch SMS logs")
  }

  return response.json()
}

export async function fetchSmsStats(): Promise<SmsStats> {
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/stats/`)

  if (!response.ok) {
    throw new Error("Failed to fetch SMS stats")
  }

  return response.json()
}

export async function fetchUniqueSenders(): Promise<UniqueSender[]> {
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/unique_senders/`)

  if (!response.ok) {
    throw new Error("Failed to fetch unique senders")
  }

  const data: UniqueSendersResponse = await response.json()
  
  // Transform the API response to match our component expectations
  return data.stats.map(stat => ({
    sender: stat.sender,
    count: stat.count
  }))
}

export async function updateSmsStatus(smsLogUid: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<SmsLog> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/sms-logs/${smsLogUid}/update_status/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  )

  if (!response.ok) {
    throw new Error("Failed to update SMS status")
  }

  return response.json()
}
