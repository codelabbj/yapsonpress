import { getAccessToken, refreshAccessToken, logout } from "./auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
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

export interface ExtractedData {
  phone?: string
  amount?: string
  network?: string
}

export interface SmsLog {
  uid: string
  device: string
  device_id: string
  device_name?: string
  sender: string
  content: string
  received_at: string
  sms_type: string
  associated_transaction?: string
  is_processed: boolean
  extracted_data: ExtractedData | null
  ai_confidence_score?: number
  status: "pending" | "approved" | "no_order"
  status_display: string
  status_changed_at?: string
  status_changed_by?: number
  status_changed_by_name?: string
  can_change_status: boolean
  created_at: string
}

export interface SmsLogsResponse {
  count: number
  next: string | null
  previous: string | null
  results: SmsLog[]
}

export interface StatusDetail {
  status: "pending" | "approved" | "no_order"
  count: number
}

export interface SmsStats {
  total: number
  by_status: {
    pending: number
    approved: number
    no_order?: number
  }
  details: StatusDetail[]
}

export interface SenderStat {
  sender: string
  count: number
  pending_count: number
}

export interface UniqueSendersResponse {
  senders: string[]
  total: number
  stats: SenderStat[]
}

export interface FcmLog {
  uid: string
  device: string
  device_id: string
  device_name?: string
  title: string
  body: string
  data: any
  associated_transaction?: string
  is_processed: boolean
  package_name: string
  external_id: string
  status: "pending" | "approved" | "no_order"
  status_display: string
  status_changed_at?: string
  status_changed_by?: number
  status_changed_by_name?: string
  can_change_status: boolean
  created_at: string
}

export interface FcmLogsResponse {
  count: number
  next: string | null
  previous: string | null
  results: FcmLog[]
}

export interface PackageStat {
  package_name: string
  count: number
}

export interface UniquePackagesResponse {
  packages: string[]
  total: number
  stats: PackageStat[]
}

export interface PinnedSender {
  uid: string
  user: number
  user_email: string
  user_name: string
  sender: string
  order: number
  pinned_at: string
  created_at: string
  updated_at: string
}

export interface PinSenderResponse {
  success: boolean
  message: string
  pinned_sender: PinnedSender
}

export interface UniqueSender {
  sender: string
  count: number
  pending_count: number
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
    let errorMessage = "Failed to fetch SMS logs"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      errorMessage = errorData.message || 
                    errorData.error || 
                    errorData.detail || 
                    errorData.non_field_errors?.[0] ||
                    `HTTP ${response.status}: ${response.statusText}` ||
                    errorMessage
    } catch (parseError) {
      console.log("Could not parse error response:", parseError)
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

export async function fetchSmsStats(): Promise<SmsStats> {
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/stats/`)

  if (!response.ok) {
    let errorMessage = "Failed to fetch SMS stats"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      errorMessage = errorData.message || 
                    errorData.error || 
                    errorData.detail || 
                    errorData.non_field_errors?.[0] ||
                    `HTTP ${response.status}: ${response.statusText}` ||
                    errorMessage
    } catch (parseError) {
      console.log("Could not parse error response:", parseError)
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

export async function fetchUniqueSenders(): Promise<UniqueSender[]> {
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/unique_senders/`)

  if (!response.ok) {
    let errorMessage = "Failed to fetch unique senders"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      errorMessage = errorData.message || 
                    errorData.error || 
                    errorData.detail || 
                    errorData.non_field_errors?.[0] ||
                    `HTTP ${response.status}: ${response.statusText}` ||
                    errorMessage
    } catch (parseError) {
      console.log("Could not parse error response:", parseError)
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  const data: UniqueSendersResponse = await response.json()
  
  // Transform the API response to match our component expectations
  return data.stats.map(stat => ({
    sender: stat.sender,
    count: stat.count,
    pending_count: stat.pending_count
  }))
}

export async function updateSmsStatus(smsLogUid: string, status: "approved" | "no_order"): Promise<SmsLog> {
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
    let errorMessage = "Failed to update SMS status"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      console.log("Response status:", response.status)
      
      // Handle Django validation errors format: {"field": ["error message"]}
      if (errorData.status && Array.isArray(errorData.status)) {
        errorMessage = errorData.status[0] // Get first error message
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else if (errorData.error) {
        errorMessage = errorData.error
      } else if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        errorMessage = errorData.non_field_errors[0]
      } else {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
    } catch (parseError) {
      console.log("Could not parse error response:", parseError)
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return response.json()
}
