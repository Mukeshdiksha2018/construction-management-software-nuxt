import { useAuthStore } from '@/stores/auth'

export interface ChangeOrderAuditLogEntry {
  timestamp: string
  user_uuid: string
  user_name: string
  user_email: string
  user_image_url?: string | null
  action: 'created' | 'updated' | 'marked_ready' | 'approved' | 'rejected' | 'deleted'
  description: string
}

export function useChangeOrderAuditLog() {
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
    action: ChangeOrderAuditLogEntry['action'],
    description: string
  ): ChangeOrderAuditLogEntry => {
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

  // Track change order creation
  const trackChangeOrderCreated = (coNumber: string): ChangeOrderAuditLogEntry => {
    return createAuditLogEntry(
      'created',
      `Change order ${coNumber} created`
    )
  }

  // Track change order update (any change)
  const trackChangeOrderUpdated = (): ChangeOrderAuditLogEntry => {
    return createAuditLogEntry(
      'updated',
      'Change order updated'
    )
  }

  // Track when change order is marked as ready
  const trackMarkedReady = (): ChangeOrderAuditLogEntry => {
    return createAuditLogEntry(
      'marked_ready',
      'Change order marked as ready for approval'
    )
  }

  // Track when change order is approved
  const trackApproved = (): ChangeOrderAuditLogEntry => {
    return createAuditLogEntry(
      'approved',
      'Change order approved'
    )
  }

  // Track when change order is rejected
  const trackRejected = (): ChangeOrderAuditLogEntry => {
    return createAuditLogEntry(
      'rejected',
      'Change order rejected'
    )
  }

  // Track when change order is deleted
  const trackDeleted = (): ChangeOrderAuditLogEntry => {
    return createAuditLogEntry(
      'deleted',
      'Change order deleted'
    )
  }

  return {
    trackChangeOrderCreated,
    trackChangeOrderUpdated,
    trackMarkedReady,
    trackApproved,
    trackRejected,
    trackDeleted,
    getCurrentUserInfo
  }
}

