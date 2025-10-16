import { getAccessToken, refreshAccessToken, logout } from "./auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken()

  if (!token) {
    logout()
    throw new Error("Not authenticated")
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    // Token expired, try to refresh
    try {
      await refreshAccessToken()
      token = getAccessToken()
      
      if (!token) {
        logout()
        throw new Error("Not authenticated")
      }

      // Retry the request with the new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (refreshError) {
      logout()
      throw new Error("Session expired")
    }
  }

  return response
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

export interface UnpinSenderResponse {
  success: boolean
  message: string
}

export interface PinnedSendersResponse {
  pinned_senders: PinnedSender[]
  count: number
  max_allowed: number
}

export async function fetchPinnedSenders(): Promise<PinnedSendersResponse> {
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/pinned_senders/`)

  if (!response.ok) {
    let errorMessage = "Failed to fetch pinned senders"
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

export async function pinSender(sender: string): Promise<PinSenderResponse> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/sms-logs/pin_sender/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender }),
    },
  )

  if (!response.ok) {
    let errorMessage = "Failed to pin sender"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      
      // Handle Django validation errors format: {"field": ["error message"]}
      if (errorData.sender && Array.isArray(errorData.sender)) {
        errorMessage = errorData.sender[0] // Get first error message
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

export async function unpinSender(sender: string): Promise<UnpinSenderResponse> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/sms-logs/unpin_sender/`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender }),
    },
  )

  if (!response.ok) {
    let errorMessage = "Failed to unpin sender"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      
      // Handle Django validation errors format: {"field": ["error message"]}
      if (errorData.sender && Array.isArray(errorData.sender)) {
        errorMessage = errorData.sender[0] // Get first error message
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
