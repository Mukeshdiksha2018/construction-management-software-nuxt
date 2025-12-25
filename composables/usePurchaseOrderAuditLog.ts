import { useAuthStore } from '@/stores/auth'

export interface PurchaseOrderAuditLogEntry {
  timestamp: string
  user_uuid: string
  user_name: string
  user_email: string
  user_image_url?: string | null
  action: 'created' | 'updated' | 'marked_ready' | 'approved' | 'rejected' | 'deleted'
  description: string
}

export function usePurchaseOrderAuditLog() {
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
    action: PurchaseOrderAuditLogEntry['action'],
    description: string
  ): PurchaseOrderAuditLogEntry => {
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

  // Track purchase order creation
  const trackPurchaseOrderCreated = (poNumber: string): PurchaseOrderAuditLogEntry => {
    return createAuditLogEntry(
      'created',
      `Purchase order ${poNumber} created`
    )
  }

  // Track purchase order update (any change)
  const trackPurchaseOrderUpdated = (): PurchaseOrderAuditLogEntry => {
    return createAuditLogEntry(
      'updated',
      'Purchase order updated'
    )
  }

  // Track when purchase order is marked as ready
  const trackMarkedReady = (): PurchaseOrderAuditLogEntry => {
    return createAuditLogEntry(
      'marked_ready',
      'Purchase order marked as ready for approval'
    )
  }

  // Track when purchase order is approved
  const trackApproved = (): PurchaseOrderAuditLogEntry => {
    return createAuditLogEntry(
      'approved',
      'Purchase order approved'
    )
  }

  // Track when purchase order is rejected
  const trackRejected = (): PurchaseOrderAuditLogEntry => {
    return createAuditLogEntry(
      'rejected',
      'Purchase order rejected'
    )
  }

  // Track when purchase order is deleted
  const trackDeleted = (): PurchaseOrderAuditLogEntry => {
    return createAuditLogEntry(
      'deleted',
      'Purchase order deleted'
    )
  }

  return {
    trackPurchaseOrderCreated,
    trackPurchaseOrderUpdated,
    trackMarkedReady,
    trackApproved,
    trackRejected,
    trackDeleted,
    getCurrentUserInfo
  }
}

