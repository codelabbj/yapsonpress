import { authenticatedFetch } from "./api"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

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
  pending_count: number
  processed_count: number
  ignored_count: number
  unread_count: number
}

export interface UniquePackagesResponse {
  packages: string[]
  total: number
  stats: PackageStat[]
}

export interface UniquePackage {
  package_name: string
  count: number
  pending_count: number
  unread_count: number
}

export async function fetchFcmLogs(params: {
  page?: number
  page_size?: number
  status?: string
  device_uid?: string
  search?: string
  ordering?: string
  date_from?: string
  date_to?: string
  package_name?: string
}): Promise<FcmLogsResponse> {
  console.log("🔍 fetchFcmLogs called with params:", params)
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value.toString())
    }
  })

  const url = `${BASE_URL}/api/payments/betting/user/fcm-logs/?${queryParams.toString()}`
  console.log("📡 fetchFcmLogs making request to:", url)
  const response = await authenticatedFetch(url)
  console.log("📡 fetchFcmLogs response status:", response.status)

  if (!response.ok) {
    let errorMessage = "Failed to fetch FCM logs"
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

export async function fetchUniquePackages(): Promise<UniquePackage[]> {
  console.log("🔍 fetchUniquePackages called - making API request")
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/fcm-logs/unique_packages/`)
  console.log("📡 fetchUniquePackages response status:", response.status)

  if (!response.ok) {
    let errorMessage = "Failed to fetch unique packages"
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

  const data: UniquePackagesResponse = await response.json()
  
  // Transform the API response to match our component expectations
  // Only show com.wave.business if count is not 0
  return data.stats
    .filter(stat => stat.package_name === "com.wave.business" && stat.count > 0)
    .map(stat => ({
      package_name: "Wave", // Display name as "Wave"
      count: stat.count,
      pending_count: stat.pending_count, // Use actual pending count from API
      unread_count: stat.unread_count
    }))
}

export async function updateFcmStatus(fcmLogUid: string, status: "approved" | "no_order"): Promise<FcmLog> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/fcm-logs/${fcmLogUid}/update_status/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  )

  if (!response.ok) {
    let errorMessage = "Failed to update FCM status"
    try {
      const errorData = await response.json()
      console.log("Backend error response:", errorData)
      
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
