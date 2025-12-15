import { defineStore } from 'pinia'

export interface TimelineEntry {
  action: string;
  timestamp: string;
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  description: string;
  user_id?: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  corporation_uuid: string;
  action: string;
  old_values?: any;
  new_values?: any;
  changed_fields?: string[];
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_image_url?: string;
  ip_address?: string;
  user_agent?: string;
  description?: string;
  metadata?: any;
  timeline_entries?: TimelineEntry[];
  created_at: string;
  updated_at: string;
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

export const useAuditLogsStore = defineStore("auditLogs", () => {
  const auditLogs = ref<AuditLog[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch audit logs for a specific entity within a corporation
  const fetchAuditLogs = async (
    entityType: string,
    entityId: string,
    corporationUuid: string
  ) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<AuditLogResponse>(
        `/api/audit-logs?entity_type=${entityType}&entity_id=${entityId}&corporation_uuid=${corporationUuid}`
      );

      if (response.success) {
        auditLogs.value = response.data;
        return response.data;
      } else {
        throw new Error("Failed to fetch audit logs");
      }
    } catch (err: any) {
      error.value = err.message || "Failed to fetch audit logs";
      console.error("Error fetching audit logs:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Create a new audit log entry
  const createAuditLog = async (auditLogData: Partial<AuditLog>) => {
    try {
      // Ensure corporation_uuid is provided
      if (!auditLogData.corporation_uuid) {
        throw new Error("corporation_uuid is required for audit logs");
      }

      const response = await $fetch<{ success: boolean; data: AuditLog }>(
        "/api/audit-logs",
        {
          method: "POST",
          body: auditLogData,
        }
      );

      if (response.success && response.data) {
        // Add to the beginning of the array (most recent first)
        auditLogs.value.unshift(response.data);
        return response.data;
      } else {
        throw new Error("Failed to create audit log");
      }
    } catch (err: any) {
      console.error("Error creating audit log:", err);
      throw err;
    }
  };

  // Get audit logs for bill entries with timeline formatting
  const getBillEntryAuditTimeline = async (
    billEntryId: string,
    corporationUuid: string
  ) => {
    const logs = await fetchAuditLogs(
      "bill_entry",
      billEntryId,
      corporationUuid
    );

    // Process consolidated logs directly (no more timeline_entries)
    const timelineItems: any[] = [];

    for (const log of logs) {
      // Use user info directly from the audit log (passed from API)
      const userInfo = {
        name: log.user_name || "System",
        imageUrl: log.user_image_url || null,
        id: log.user_id || null,
        initials: log.user_name
          ? log.user_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "S",
      };

      timelineItems.push({
        id: log.id,
        date: new Date(log.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: getActionTitle(log.action),
        description: log.description || getActionDescription(log),
        icon: getActionIcon(log.action),
        color: getActionColor(log.action),
        user: userInfo.name,
        userInfo: userInfo,
        timestamp: log.created_at,
        action: log.action,
        metadata: {
          ...log.metadata,
          changedFields: log.changed_fields || [],
          oldValues: log.old_values,
          newValues: log.new_values,
        },
      });
    }

    // Sort timeline items by timestamp (most recent first)
    return timelineItems.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // Get audit logs for projects with timeline formatting
  const getProjectAuditTimeline = async (
    projectId: string,
    corporationUuid: string
  ) => {
    const logs = await fetchAuditLogs("project", projectId, corporationUuid);

    // Process consolidated logs directly (no more timeline_entries)
    const timelineItems: any[] = [];

    for (const log of logs) {
      // Use user info directly from the audit log (passed from API)
      const userInfo = {
        name: log.user_name || "System",
        imageUrl: log.user_image_url || null,
        id: log.user_id || null,
        initials: log.user_name
          ? log.user_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "S",
      };

      timelineItems.push({
        id: log.id,
        date: new Date(log.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        title: "Journal Entry Action",
        description: log.description || getJournalActionDescription(log),
        icon: getActionIcon(log.action),
        color: getActionColor(log.action),
        user: userInfo.name,
        userInfo: userInfo,
        timestamp: log.created_at,
        action: log.action,
        metadata: {
          ...log.metadata,
          changedFields: log.changed_fields || [],
          oldValues: log.old_values,
          newValues: log.new_values,
        },
      });
    }

    // Sort timeline items by timestamp (most recent first)
    return timelineItems.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  // Helper functions for timeline formatting
  const getActionTitle = (action: string): string => {
    const actionTitles: Record<string, string> = {
      created: "Bill Created",
      updated: "Bill Updated",
      deleted: "Bill Deleted",
      approved: "Bill Approved",
      rejected: "Bill Rejected",
      submitted: "Bill Submitted",
      voided: "Bill Voided",
      payment_processed: "Payment Processed",
      attachment_added: "Attachment Added",
      attachment_removed: "Attachment Removed",
    };
    return actionTitles[action] || "Action Performed";
  };

  const getActionDescription = (log: AuditLog): string => {
    const baseDescription = log.description || `${log.action} action performed`;

    if (log.user_name) {
      return `${baseDescription} by ${log.user_name}`;
    }

    return baseDescription;
  };

  const getJournalActionDescription = (log: AuditLog): string => {
    const baseDescription = log.description || `${log.action} action performed`;

    if (log.user_name) {
      return `${baseDescription} by ${log.user_name}`;
    }

    return baseDescription;
  };

  const getActionIcon = (action: string): string => {
    const actionIcons: Record<string, string> = {
      created: "i-heroicons-plus-circle",
      updated: "i-heroicons-pencil-square",
      deleted: "i-heroicons-trash",
      approved: "i-heroicons-check-circle",
      rejected: "i-heroicons-x-circle",
      submitted: "i-heroicons-paper-airplane",
      voided: "i-heroicons-no-symbol",
      payment_processed: "i-heroicons-credit-card",
      attachment_added: "i-heroicons-paper-clip",
      attachment_removed: "i-heroicons-minus-circle",
    };
    return actionIcons[action] || "i-heroicons-information-circle";
  };

  const getActionColor = (action: string): string => {
    const actionColors: Record<string, string> = {
      created: "success",
      updated: "primary",
      deleted: "error",
      approved: "success",
      rejected: "error",
      submitted: "info",
      voided: "warning",
      payment_processed: "success",
      attachment_added: "info",
      attachment_removed: "warning",
    };
    return actionColors[action] || "neutral";
  };

  // Get user display info for timeline from userProfiles store
  const getUserDisplayInfo = async (entry: TimelineEntry) => {
    const userId = entry.user_id;

    if (!userId) {
      return {
        name: "System",
        imageUrl: null,
        id: null,
        initials: "S",
      };
    }

    try {
      // Get user info from userProfiles store (same as TopBar)
      const { useUserProfilesStore } = await import("@/stores/userProfiles");
      const userProfilesStore = useUserProfilesStore();

      // Ensure users are loaded
      if (userProfilesStore.users.length === 0) {
        await userProfilesStore.fetchUsers();
      }

      const user = userProfilesStore.users.find((u) => u.id === userId);

      if (user) {
        const fullName = `${user.firstName} ${user.lastName}`.trim();
        return {
          name: fullName || user.email,
          imageUrl: user.imageUrl, // Use the same imageUrl that TopBar uses
          id: user.id,
          initials: fullName
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
        };
      }
    } catch (error) {
      console.error("Error fetching user info for audit log:", error);
    }

    // Fallback if user not found
    return {
      name: "Unknown User",
      imageUrl: null,
      id: userId,
      initials: "U",
    };
  };

  // Clear audit logs
  const clearAuditLogs = () => {
    auditLogs.value = [];
    error.value = null;
  };

  return {
    auditLogs: readonly(auditLogs),
    loading: readonly(loading),
    error: readonly(error),
    fetchAuditLogs,
    createAuditLog,
    getBillEntryAuditTimeline,
    getProjectAuditTimeline,
    getUserDisplayInfo,
    clearAuditLogs,
  };
});
