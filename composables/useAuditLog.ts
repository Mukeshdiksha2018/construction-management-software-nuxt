import { ref, computed, type Ref } from 'vue'

export interface AuditLogInfo {
  title: string
  subtitle: string
  status: string
  statusColor: 'success' | 'warning' | 'error' | 'neutral'
}

export interface UseAuditLogOptions {
  entityType: "bill_entry" | "project" | "estimate";
  corporationUuid: Ref<string>;
  formatCurrency: (amount: number) => string;
}

export function useAuditLog(options: UseAuditLogOptions) {
  const { entityType, corporationUuid, formatCurrency } = options;

  const showAuditLogModal = ref(false);
  const auditLogsCount = ref(0);

  // Generate audit log info based on entity type and form data
  const generateAuditLogInfo = (form: any): AuditLogInfo | undefined => {
    if (!form.id) return undefined;

    if (entityType === "bill_entry") {
      const vendorName =
        form.vendors?.vendor_name || form.payee_name || "Unknown Vendor";
      const billNumber = form.number || "N/A";
      const status = form.approval_status || "Pending";

      const statusColors = {
        Pending: "warning",
        Approved: "success",
        Rejected: "error",
      } as const;

      return {
        title: `Bill #${billNumber}`,
        subtitle: `${vendorName} - ${formatCurrency(form.amount)}`,
        status: status,
        statusColor:
          statusColors[status as keyof typeof statusColors] || "neutral",
      };
    } else if (entityType === "project") {
      const projectName = form.project_name || "N/A";
      const projectId = form.project_id || "N/A";
      const status =
        Math.abs(form.difference || 0) < 0.01 ? "Balanced" : "Unbalanced";

      const statusColors = {
        Balanced: "success",
        Unbalanced: "warning",
      } as const;

      return {
        title: `Project: ${projectName}`,
        subtitle: `ID: ${projectId} - ${formatCurrency(
          form.estimated_amount || 0
        )}`,
        status: status,
        statusColor:
          statusColors[status as keyof typeof statusColors] || "neutral",
      };
    } else if (entityType === "estimate") {
      const estimateNumber = form.estimate_number || "N/A";
      const projectName = form.project?.project_name || "N/A";
      const status = form.status || "Draft";

      const statusColors = {
        Draft: "neutral",
        Pending: "warning",
        Approved: "success",
        Rejected: "error",
        Expired: "neutral",
      } as const;

      return {
        title: `Estimate #${estimateNumber}`,
        subtitle: `Project: ${projectName} - ${formatCurrency(
          form.final_amount || 0
        )}`,
        status: status,
        statusColor:
          statusColors[status as keyof typeof statusColors] || "neutral",
      };
    }

    return undefined;
  };

  // Audit log methods
  const showAuditLog = () => {
    showAuditLogModal.value = true;
  };

  const closeAuditLog = () => {
    showAuditLogModal.value = false;
    auditLogsCount.value = 0;
  };

  const onAuditLogsLoaded = (logs: any[]) => {
    auditLogsCount.value = logs.length;
  };

  const onAuditLogError = (error: string) => {
    console.error("Audit log error:", error);
  };

  const onExportAuditLogs = (logs: any[]) => {
    // Export audit logs functionality
  };

  return {
    // State
    showAuditLogModal,
    auditLogsCount,

    // Methods
    generateAuditLogInfo,
    showAuditLog,
    closeAuditLog,
    onAuditLogsLoaded,
    onAuditLogError,
    onExportAuditLogs,
  };
}
