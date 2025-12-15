import { useAuthStore } from '@/stores/auth'

export interface EstimateAuditLogEntry {
  timestamp: string
  user_uuid: string
  user_name: string
  user_email: string
  user_image_url?: string | null
  action: 'created' | 'updated' | 'marked_ready' | 'approved' | 'unapproved'
  description: string
}

export function useEstimateAuditLog() {
  const authStore = useAuthStore()

  // Get current user info
  const getCurrentUserInfo = () => {
    const user = authStore.user
    if (!user) {
      return {
        user_uuid: '',
        user_name: 'System',
        user_email: '',
        user_image_url: null
      }
    }

    return {
      user_uuid: user.id || '',
      user_name: user.user_metadata?.full_name || 
                 `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                 user.email?.split('@')[0] || 
                 'Unknown User',
      user_email: user.email || '',
      user_image_url: user.user_metadata?.avatar_url || user.user_metadata?.image_url || null
    }
  }

  // Create an audit log entry
  const createAuditLogEntry = (
    action: EstimateAuditLogEntry['action'],
    description: string
  ): EstimateAuditLogEntry => {
    const userInfo = getCurrentUserInfo()
    
    return {
      timestamp: new Date().toISOString(),
      user_uuid: userInfo.user_uuid,
      user_name: userInfo.user_name,
      user_email: userInfo.user_email,
      user_image_url: userInfo.user_image_url,
      action,
      description
    }
  }

  // Track estimate creation
  const trackEstimateCreated = (estimateNumber: string): EstimateAuditLogEntry => {
    return createAuditLogEntry(
      'created',
      `Estimate ${estimateNumber} created`
    )
  }

  // Track estimate update (any change)
  const trackEstimateUpdated = (): EstimateAuditLogEntry => {
    return createAuditLogEntry(
      'updated',
      'Estimate updated'
    )
  }

  // Track when estimate is marked as ready
  const trackMarkedReady = (): EstimateAuditLogEntry => {
    return createAuditLogEntry(
      'marked_ready',
      'Estimate marked as ready'
    )
  }

  // Track when estimate is approved
  const trackApproved = (): EstimateAuditLogEntry => {
    return createAuditLogEntry(
      'approved',
      'Estimate approved'
    )
  }

  // Track when estimate is unapproved (status changed from Approved to something else)
  const trackUnapproved = (): EstimateAuditLogEntry => {
    return createAuditLogEntry(
      'unapproved',
      'Estimate unapproved'
    )
  }

  return {
    trackEstimateCreated,
    trackEstimateUpdated,
    trackMarkedReady,
    trackApproved,
    trackUnapproved,
    getCurrentUserInfo
  }
}

