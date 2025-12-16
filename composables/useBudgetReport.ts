import { ref, readonly } from 'vue'
import { useCostCodeDivisionsStore } from '@/stores/costCodeDivisions'
import { useCostCodeConfigurationsStore } from '@/stores/costCodeConfigurations'
import { useEstimatesStore } from '@/stores/estimates'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import { useBillEntriesStore } from '@/stores/billEntries'
import { useProjectsStore } from '@/stores/projects'

export interface BudgetReportRow {
  costCodeUuid: string
  costCodeNumber: string
  costCodeName: string
  divisionUuid: string
  divisionName: string
  divisionNumber: string
  level: 'division' | 'costCode' | 'subCostCode'
  parentCostCodeUuid?: string
  budgetedAmount: number
  purchaseOrderAmount: number
  changeOrderAmount: number
  totalAmount: number
  paidAmount: number
  budgetRemaining: number
  costPerRoom: number
  isTotal?: boolean
}

export interface BudgetReportData {
  project: {
    uuid: string;
    projectName: string;
    projectId: string;
    numberOfRooms: number;
  };
  divisions: Array<{
    uuid: string;
    divisionNumber: string;
    divisionName: string;
    order: number;
    excludeInEstimatesAndReports?: boolean;
      costCodes: Array<{
      uuid: string;
      costCodeNumber: string;
      costCodeName: string;
      order: number;
      budgetedAmount: number;
      purchaseOrderAmount: number;
      changeOrderAmount: number;
      totalAmount: number;
      paidAmount: number;
      budgetRemaining: number;
      costPerRoom: number;
      subCostCodes?: Array<{
        uuid: string;
        costCodeNumber: string;
        costCodeName: string;
        order: number;
        budgetedAmount: number;
        purchaseOrderAmount: number;
        changeOrderAmount: number;
        totalAmount: number;
        paidAmount: number;
        budgetRemaining: number;
        costPerRoom: number;
        subCostCodes?: Array<{
          uuid: string;
          costCodeNumber: string;
          costCodeName: string;
          order: number;
          budgetedAmount: number;
          purchaseOrderAmount: number;
          changeOrderAmount: number;
          totalAmount: number;
          paidAmount: number;
          budgetRemaining: number;
          costPerRoom: number;
        }>;
      }>;
    }>;
    totalBudgeted: number;
    totalPurchaseOrder: number;
    totalChangeOrder: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
  }>;
  summary: {
    totalBudgeted: number;
    totalPurchaseOrder: number;
    totalChangeOrder: number;
    totalAmount: number;
    totalPaid: number;
    totalRemaining: number;
    costPerRoom: number;
  };
}

export const useBudgetReport = () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const costCodeDivisionsStore = useCostCodeDivisionsStore()
  const costCodeConfigurationsStore = useCostCodeConfigurationsStore()
  const estimatesStore = useEstimatesStore()
  const purchaseOrdersStore = usePurchaseOrdersStore()
  const changeOrdersStore = useChangeOrdersStore()
  const billEntriesStore = useBillEntriesStore()
  const projectsStore = useProjectsStore()

  const generateBudgetReport = async (
    corporationUuid: string,
    projectUuid: string
  ): Promise<BudgetReportData | null> => {
    if (!corporationUuid || !projectUuid) {
      error.value = 'Corporation and project are required'
      return null
    }

    loading.value = true
    error.value = null

    try {
      // Fetch all required data
      await Promise.all([
        costCodeDivisionsStore.fetchDivisions(corporationUuid),
        costCodeConfigurationsStore.fetchConfigurations(corporationUuid),
        estimatesStore.fetchEstimates(corporationUuid),
        purchaseOrdersStore.fetchPurchaseOrders(corporationUuid),
        changeOrdersStore.fetchChangeOrders(corporationUuid),
        billEntriesStore.fetchBillEntries(corporationUuid),
      ]);

      // Get project details - need full project data, not just metadata
      // Try to load from currentProject first (if already loaded)
      let project =
        projectsStore.currentProject?.uuid === projectUuid
          ? projectsStore.currentProject
          : null;

      // If not in currentProject, try to load from IndexedDB
      if (!project) {
        const loaded = await projectsStore.loadCurrentProject(
          projectUuid,
          corporationUuid
        );
        if (loaded) {
          project = projectsStore.currentProject;
        }
      }

      // If still not found, try to fetch from API
      if (!project) {
        project = await projectsStore.fetchProject(projectUuid);
      }

      // If still not found, try to find in metadata (fallback, but won't have no_of_rooms)
      if (!project) {
        project = projectsStore.projects.find(
          (p) => p.uuid === projectUuid
        ) as any;
      }

      if (!project) {
        error.value = "Project not found";
        return null;
      }

      const numberOfRooms = (project as any).no_of_rooms || 0; // Use no_of_rooms from project, default to 0 if not available

      // Get all cost code configurations for the corporation
      const allCostCodes = costCodeConfigurationsStore
        .getConfigurationsByCorporation(corporationUuid)
        .filter((cc) => cc.is_active);

      // Get all divisions
      const divisions = costCodeDivisionsStore
        .getActiveDivisions(corporationUuid)
        .sort((a, b) => (a.division_order || 0) - (b.division_order || 0));

      // Get estimates for this project - only include approved and active estimates for budget calculation
      let projectEstimates = estimatesStore.getEstimatesByProject(projectUuid);

      // Filter to only approved and active estimates for budgeted amount calculation
      // Must be: status === "Approved" AND is_active === true (boolean) AND project_uuid matches
      projectEstimates = projectEstimates.filter((estimate) => {
        // Check if estimate is approved
        const isApproved = estimate.status === "Approved";

        // Check if estimate is active - handle both boolean true and string "TRUE"/"true"
        const isActive =
          estimate.is_active === true ||
          String(estimate.is_active).toUpperCase() === "TRUE";

        // Check project UUID matches
        const projectMatches = estimate.project_uuid === projectUuid;

        return isApproved && isActive && projectMatches;
      });

      // Fetch line_items for estimates that don't have them loaded
      const estimatesWithLineItems = [];
      for (const estimate of projectEstimates) {
        if (!estimate.line_items || estimate.line_items.length === 0) {
          try {
            const { apiFetch } = useApiClient();
            const estimateResponse: any = await apiFetch(
              `/api/estimates/${estimate.uuid}`,
              {
                method: "GET",
              }
            );
            if (estimateResponse?.data) {
              estimatesWithLineItems.push({
                ...estimate,
                line_items: estimateResponse.data.line_items || [],
              });
            } else {
              estimatesWithLineItems.push(estimate);
            }
          } catch (error) {
            estimatesWithLineItems.push(estimate);
          }
        } else {
          estimatesWithLineItems.push(estimate);
        }
      }
      projectEstimates = estimatesWithLineItems;

      // Get purchase orders for this project
      const projectPurchaseOrders = purchaseOrdersStore.purchaseOrders.filter(
        (po) => po.project_uuid === projectUuid && po.is_active !== false
      );

      // Fetch items for all purchase orders that don't have items loaded
      const purchaseOrderItemsMap = new Map<string, any[]>();
      for (const po of projectPurchaseOrders) {
        if (!po.po_items || po.po_items.length === 0) {
          try {
            const { apiFetch } = useApiClient();
            const itemsResponse: any = await apiFetch(
              "/api/purchase-order-items",
              {
                method: "GET",
                query: { purchase_order_uuid: po.uuid },
              }
            );
            if (itemsResponse?.data && Array.isArray(itemsResponse.data)) {
              purchaseOrderItemsMap.set(po.uuid || "", itemsResponse.data);
            }
          } catch (error) {
            // Silently handle error
          }
        } else {
          purchaseOrderItemsMap.set(po.uuid || "", [...(po.po_items || [])]);
        }
      }

      // Fetch labor purchase order items for all LABOR type purchase orders
      const laborPurchaseOrderItemsMap = new Map<string, any[]>();
      for (const po of projectPurchaseOrders) {
        // Only fetch labor items if PO type is LABOR
        const poType = (po.po_type || "MATERIAL").toUpperCase();
        if (poType === "LABOR") {
          try {
            const { apiFetch } = useApiClient();
            const laborItemsResponse: any = await apiFetch(
              "/api/labor-purchase-order-items",
              {
                method: "GET",
                query: { purchase_order_uuid: po.uuid },
              }
            );
            if (
              laborItemsResponse?.data &&
              Array.isArray(laborItemsResponse.data)
            ) {
              // Filter out inactive items
              const activeItems = laborItemsResponse.data.filter(
                (item: any) => item.is_active !== false
              );
              laborPurchaseOrderItemsMap.set(po.uuid || "", activeItems);
            }
          } catch (error) {
            // Silently handle error
          }
        }
      }

      // Get change orders for this project (all active change orders)
      const projectChangeOrders = changeOrdersStore.changeOrders.filter(
        (co) => co.project_uuid === projectUuid && co.is_active !== false
      );

      // Get change orders with status Approved, Partially_Received, or Completed for change order amount calculation
      const approvedChangeOrders = projectChangeOrders.filter((co) => {
        const status = String(co.status || "").toLowerCase();
        return (
          status === "approved" ||
          status === "partially_received" ||
          status === "completed"
        );
      });

      // Fetch material change order items for all change orders that don't have items loaded
      const changeOrderItemsMap = new Map<string, any[]>();
      for (const co of projectChangeOrders) {
        if (!co.co_items || co.co_items.length === 0) {
          try {
            const { apiFetch } = useApiClient();
            const itemsResponse: any = await apiFetch("/api/change-order-items", {
              method: "GET",
              query: { change_order_uuid: co.uuid },
            });
            if (itemsResponse?.data && Array.isArray(itemsResponse.data)) {
              changeOrderItemsMap.set(co.uuid || "", itemsResponse.data);
            }
          } catch (error) {
            // Silently handle error
          }
        } else {
          changeOrderItemsMap.set(co.uuid || "", [...(co.co_items || [])]);
        }
      }

      // Fetch labor change order items for all change orders
      const laborChangeOrderItemsMap = new Map<string, any[]>();
      for (const co of projectChangeOrders) {
        // Only fetch labor items if CO type is LABOR
        if (co.co_type === "LABOR") {
          try {
            const { apiFetch } = useApiClient();
            const laborItemsResponse: any = await apiFetch(
              "/api/labor-change-order-items",
              {
                method: "GET",
                query: { change_order_uuid: co.uuid },
              }
            );
            if (
              laborItemsResponse?.data &&
              Array.isArray(laborItemsResponse.data)
            ) {
              // Filter out inactive items
              const activeItems = laborItemsResponse.data.filter(
                (item: any) => item.is_active !== false
              );
              laborChangeOrderItemsMap.set(co.uuid || "", activeItems);
            }
          } catch (error) {
            // Silently handle error
          }
        }
      }

      // Get bill entries for this corporation (filtered by project if possible)
      // Note: Bill entries don't have direct project_uuid, so we'll use all approved bill entries
      const approvedBillEntries = billEntriesStore.billEntries.filter(
        (be) => be.approval_status === "Approved" && !be.void
      );

      // Aggregate amounts by cost code
      const costCodeAmounts = new Map<
        string,
        {
          budgeted: number;
          purchaseOrder: number;
          changeOrder: number;
          paid: number;
        }
      >();

      // Helper function to get project contingency percentage
      const getProjectContingencyPercent = (): number => {
        const raw = (project as any)?.contingency_percentage;
        if (raw === null || raw === undefined || raw === '') {
          return 0;
        }
        const parsed = parseFloat(String(raw));
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      };

      // Aggregate estimate amounts (budgeted) - this is the original budget
      projectEstimates.forEach((estimate) => {
        if (!estimate.line_items || estimate.line_items.length === 0) {
          return;
        }
        estimate.line_items.forEach((item: any) => {
          if (item.cost_code_uuid) {
            const existing = costCodeAmounts.get(item.cost_code_uuid) || {
              budgeted: 0,
              purchaseOrder: 0,
              changeOrder: 0,
              paid: 0,
            };

            // Calculate base budgeted amount (without contingency)
            // Note: total_amount in line items is the base amount (labor + material) without contingency
            const baseAmount = parseFloat(item.total_amount) || 0;
            
            // Calculate contingency amount if enabled
            let contingencyAmount = 0;
            if (item.contingency_enabled === true) {
              // First, check if contingency_amount is already calculated and stored
              const storedContingencyAmount = parseFloat(item.contingency_amount) || 0;
              if (storedContingencyAmount > 0) {
                // Use stored contingency amount if available
                contingencyAmount = storedContingencyAmount;
              } else {
                // Otherwise, calculate from contingency_percentage
                // Use item's contingency_percentage, or fallback to project contingency if null/undefined
                let contingencyPercent = parseFloat(item.contingency_percentage);
                if (isNaN(contingencyPercent) || contingencyPercent === null || contingencyPercent === undefined) {
                  contingencyPercent = getProjectContingencyPercent();
                }
                // Calculate contingency amount: base * (percentage / 100)
                contingencyAmount = baseAmount * (contingencyPercent / 100);
              }
            }
            
            // Budgeted amount = base amount + contingency amount
            const budgetedAmount = baseAmount + contingencyAmount;

            existing.budgeted += budgetedAmount;
            costCodeAmounts.set(item.cost_code_uuid, existing);
          }
        });
      });

      // Note: Purchase orders represent commitments against the budget (from estimates)
      // They should NOT be added to the budgeted amount to avoid double-counting
      // POs contribute to "purchaseOrderAmount" when approved/partially_received/completed, and to "paid" amounts when approved/completed

      // Get purchase orders with status Approved, Partially_Received, or Completed for purchase order amount calculation
      const approvedPurchaseOrders = projectPurchaseOrders.filter((po) => {
        const status = String(po.status || "").toLowerCase();
        return (
          status === "approved" ||
          status === "partially_received" ||
          status === "completed"
        );
      });

      // Aggregate purchase order amounts (only Approved purchase orders)
      approvedPurchaseOrders.forEach((po) => {
        // Determine PO type - default to MATERIAL if not specified
        const poType = (po.po_type || "MATERIAL").toUpperCase();

        // Process material purchase order items (for MATERIAL type POs or when type is not specified)
        if (poType === "MATERIAL") {
          const items = purchaseOrderItemsMap.get(po.uuid || "") || [];

          // First pass: Calculate total item amount and collect cost code item amounts
          let totalItemAmount = 0;
          const costCodeItemAmounts = new Map<string, number>();

          items.forEach((item: any) => {
            if (item.cost_code_uuid) {
              // Use po_total if available, otherwise calculate from po_unit_price * po_quantity
              const itemAmount =
                item.po_total ||
                (item.po_unit_price || 0) * (item.po_quantity || 0);

              totalItemAmount += itemAmount;

              // Accumulate item amounts by cost code
              const currentAmount =
                costCodeItemAmounts.get(item.cost_code_uuid) || 0;
              costCodeItemAmounts.set(
                item.cost_code_uuid,
                currentAmount + itemAmount
              );
            }
          });

          // Get charges and taxes from PO
          const chargesTotal = po.charges_total || 0;
          const taxTotal = po.tax_total || 0;
          const chargesAndTaxes = chargesTotal + taxTotal;

          // Second pass: Distribute item amounts and proportional charges/taxes to each cost code
          costCodeItemAmounts.forEach((itemAmount, costCodeUuid) => {
            const existing = costCodeAmounts.get(costCodeUuid) || {
              budgeted: 0,
              purchaseOrder: 0,
              changeOrder: 0,
              paid: 0,
            };

            // Calculate proportional share of charges and taxes based on item amount
            const proportionalChargesAndTaxes =
              totalItemAmount > 0
                ? (itemAmount / totalItemAmount) * chargesAndTaxes
                : 0;

            // Add item amount + proportional charges and taxes
            existing.purchaseOrder += itemAmount + proportionalChargesAndTaxes;
            costCodeAmounts.set(costCodeUuid, existing);
          });
        }

        // Process labor purchase order items (for LABOR type POs)
        if (poType === "LABOR") {
          const laborItems =
            laborPurchaseOrderItemsMap.get(po.uuid || "") || [];

          // First pass: Calculate total item amount and collect cost code item amounts
          let totalItemAmount = 0;
          const costCodeItemAmounts = new Map<string, number>();

          laborItems.forEach((item: any) => {
            if (item.cost_code_uuid) {
              // Labor purchase orders use po_amount directly
              const itemAmount = item.po_amount || 0;
              totalItemAmount += itemAmount;

              // Accumulate item amounts by cost code
              const currentAmount =
                costCodeItemAmounts.get(item.cost_code_uuid) || 0;
              costCodeItemAmounts.set(
                item.cost_code_uuid,
                currentAmount + itemAmount
              );
            }
          });

          // Get charges and taxes from PO
          const chargesTotal = po.charges_total || 0;
          const taxTotal = po.tax_total || 0;
          const chargesAndTaxes = chargesTotal + taxTotal;

          // Second pass: Distribute item amounts and proportional charges/taxes to each cost code
          costCodeItemAmounts.forEach((itemAmount, costCodeUuid) => {
            const existing = costCodeAmounts.get(costCodeUuid) || {
              budgeted: 0,
              purchaseOrder: 0,
              changeOrder: 0,
              paid: 0,
            };

            // Calculate proportional share of charges and taxes based on item amount
            const proportionalChargesAndTaxes =
              totalItemAmount > 0
                ? (itemAmount / totalItemAmount) * chargesAndTaxes
                : 0;

            // Add item amount + proportional charges and taxes
            existing.purchaseOrder += itemAmount + proportionalChargesAndTaxes;
            costCodeAmounts.set(costCodeUuid, existing);
          });
        }
      });

      // Aggregate change order amounts (only Approved change orders)
      approvedChangeOrders.forEach((co) => {
        // Process material change order items (for MATERIAL type COs)
        if (co.co_type === "MATERIAL") {
          const items = changeOrderItemsMap.get(co.uuid || "") || [];

          // First pass: Calculate total item amount and collect cost code item amounts
          let totalItemAmount = 0;
          const costCodeItemAmounts = new Map<string, number>();

          items.forEach((item: any) => {
            if (item.cost_code_uuid) {
              // Use co_total if available, otherwise calculate from co_unit_price * co_quantity
              const itemAmount =
                item.co_total ||
                (item.co_unit_price || 0) * (item.co_quantity || 0);

              totalItemAmount += itemAmount;

              // Accumulate item amounts by cost code
              const currentAmount =
                costCodeItemAmounts.get(item.cost_code_uuid) || 0;
              costCodeItemAmounts.set(
                item.cost_code_uuid,
                currentAmount + itemAmount
              );
            }
          });

          // Get charges and taxes from CO
          const chargesTotal = co.charges_total || 0;
          const taxTotal = co.tax_total || 0;
          const chargesAndTaxes = chargesTotal + taxTotal;

          // Second pass: Distribute item amounts and proportional charges/taxes to each cost code
          costCodeItemAmounts.forEach((itemAmount, costCodeUuid) => {
            const existing = costCodeAmounts.get(costCodeUuid) || {
              budgeted: 0,
              purchaseOrder: 0,
              changeOrder: 0,
              paid: 0,
            };

            // Calculate proportional share of charges and taxes based on item amount
            const proportionalChargesAndTaxes =
              totalItemAmount > 0
                ? (itemAmount / totalItemAmount) * chargesAndTaxes
                : 0;

            // Add item amount + proportional charges and taxes
            existing.changeOrder += itemAmount + proportionalChargesAndTaxes;
            costCodeAmounts.set(costCodeUuid, existing);
          });
        }

        // Process labor change order items (for LABOR type COs)
        if (co.co_type === "LABOR") {
          const laborItems = laborChangeOrderItemsMap.get(co.uuid || "") || [];

          // First pass: Calculate total item amount and collect cost code item amounts
          let totalItemAmount = 0;
          const costCodeItemAmounts = new Map<string, number>();

          laborItems.forEach((item: any) => {
            if (item.cost_code_uuid) {
              // Labor change orders use co_amount directly
              const itemAmount = item.co_amount || 0;
              totalItemAmount += itemAmount;

              // Accumulate item amounts by cost code
              const currentAmount =
                costCodeItemAmounts.get(item.cost_code_uuid) || 0;
              costCodeItemAmounts.set(
                item.cost_code_uuid,
                currentAmount + itemAmount
              );
            }
          });

          // Get charges and taxes from CO
          const chargesTotal = co.charges_total || 0;
          const taxTotal = co.tax_total || 0;
          const chargesAndTaxes = chargesTotal + taxTotal;

          // Second pass: Distribute item amounts and proportional charges/taxes to each cost code
          costCodeItemAmounts.forEach((itemAmount, costCodeUuid) => {
            const existing = costCodeAmounts.get(costCodeUuid) || {
              budgeted: 0,
              purchaseOrder: 0,
              changeOrder: 0,
              paid: 0,
            };

            // Calculate proportional share of charges and taxes based on item amount
            const proportionalChargesAndTaxes =
              totalItemAmount > 0
                ? (itemAmount / totalItemAmount) * chargesAndTaxes
                : 0;

            // Add item amount + proportional charges and taxes
            existing.changeOrder += itemAmount + proportionalChargesAndTaxes;
            costCodeAmounts.set(costCodeUuid, existing);
          });
        }
      });

      // Aggregate paid amounts from vendor invoices with status = 'Paid'
      // Fetch all vendor invoices for this corporation and filter for paid status and project
      try {
        const { apiFetch } = useApiClient();
        const invoicesResponse: any = await apiFetch("/api/vendor-invoices", {
          method: "GET",
          query: {
            corporation_uuid: corporationUuid,
          },
        });

        // Filter invoices: must be Paid status, active, and for this project
        const paidInvoices = (Array.isArray(invoicesResponse?.data)
          ? invoicesResponse.data
          : []
        ).filter(
          (invoice: any) =>
            invoice.status === "Paid" &&
            invoice.is_active !== false &&
            invoice.project_uuid === projectUuid
        );

        // Process each paid invoice - fetch full invoice details to get items
        for (const invoice of paidInvoices) {
          if (!invoice.uuid) continue;

          try {
            // Fetch full invoice details which includes all related items
            const { apiFetch } = useApiClient();
            const fullInvoiceResponse: any = await apiFetch(
              `/api/vendor-invoices/${invoice.uuid}`,
              {
                method: "GET",
              }
            );

            const fullInvoice = fullInvoiceResponse?.data;
            if (!fullInvoice) continue;

            const invoiceType = fullInvoice.invoice_type || "";

            // Get the invoice total amount (includes all items, charges, and taxes)
            const invoiceTotalAmount = parseFloat(fullInvoice.amount || "0") || 0;

            let totalItemAmount = 0;
            const costCodeItemAmounts = new Map<string, number>();

            if (invoiceType === "AGAINST_PO" && fullInvoice.po_invoice_items) {
              // Process purchase order invoice items
              const poInvoiceItems = Array.isArray(fullInvoice.po_invoice_items)
                ? fullInvoice.po_invoice_items
                : [];

              poInvoiceItems.forEach((item: any) => {
                if (item.cost_code_uuid && item.is_active !== false) {
                  const itemAmount =
                    parseFloat(item.invoice_total || "0") ||
                    (parseFloat(item.invoice_unit_price || "0") || 0) *
                      (parseFloat(item.invoice_quantity || "0") || 0);
                  totalItemAmount += itemAmount;

                  const currentAmount =
                    costCodeItemAmounts.get(item.cost_code_uuid) || 0;
                  costCodeItemAmounts.set(
                    item.cost_code_uuid,
                    currentAmount + itemAmount
                  );
                }
              });
            } else if (
              invoiceType === "AGAINST_CO" &&
              fullInvoice.co_invoice_items
            ) {
              // Process change order invoice items
              const coInvoiceItems = Array.isArray(fullInvoice.co_invoice_items)
                ? fullInvoice.co_invoice_items
                : [];

              coInvoiceItems.forEach((item: any) => {
                if (item.cost_code_uuid && item.is_active !== false) {
                  const itemAmount =
                    parseFloat(item.invoice_total || "0") ||
                    (parseFloat(item.invoice_unit_price || "0") || 0) *
                      (parseFloat(item.invoice_quantity || "0") || 0);
                  totalItemAmount += itemAmount;

                  const currentAmount =
                    costCodeItemAmounts.get(item.cost_code_uuid) || 0;
                  costCodeItemAmounts.set(
                    item.cost_code_uuid,
                    currentAmount + itemAmount
                  );
                }
              });
            } else if (
              invoiceType === "AGAINST_ADVANCE_PAYMENT" &&
              fullInvoice.advance_payment_cost_codes
            ) {
              // Process advance payment cost codes
              const advanceCostCodes = Array.isArray(
                fullInvoice.advance_payment_cost_codes
              )
                ? fullInvoice.advance_payment_cost_codes
                : [];

              advanceCostCodes.forEach((costCode: any) => {
                if (costCode.cost_code_uuid && costCode.is_active !== false) {
                  const advanceAmount =
                    parseFloat(costCode.advance_amount || "0") || 0;
                  totalItemAmount += advanceAmount;

                  const currentAmount =
                    costCodeItemAmounts.get(costCode.cost_code_uuid) || 0;
                  costCodeItemAmounts.set(
                    costCode.cost_code_uuid,
                    currentAmount + advanceAmount
                  );
                }
              });
            } else if (
              invoiceType === "ENTER_DIRECT_INVOICE" &&
              fullInvoice.line_items
            ) {
              // Process direct invoice line items
              const lineItems = Array.isArray(fullInvoice.line_items)
                ? fullInvoice.line_items
                : [];

              lineItems.forEach((item: any) => {
                if (item.cost_code_uuid && item.is_active !== false) {
                  const itemAmount =
                    parseFloat(item.total || "0") ||
                    (parseFloat(item.unit_price || "0") || 0) *
                      (parseFloat(item.quantity || "0") || 0);
                  totalItemAmount += itemAmount;

                  const currentAmount =
                    costCodeItemAmounts.get(item.cost_code_uuid) || 0;
                  costCodeItemAmounts.set(
                    item.cost_code_uuid,
                    currentAmount + itemAmount
                  );
                }
              });
            }

            // Distribute the invoice total amount (including all taxes and charges) proportionally by cost code
            // This ensures we capture the exact paid amount including all taxes
            if (totalItemAmount > 0 && invoiceTotalAmount > 0) {
              costCodeItemAmounts.forEach((itemAmount, costCodeUuid) => {
                const existing = costCodeAmounts.get(costCodeUuid) || {
                  budgeted: 0,
                  purchaseOrder: 0,
                  changeOrder: 0,
                  paid: 0,
                };

                // Calculate proportional share of the total invoice amount (which includes taxes and charges)
                const proportionalAmount = (itemAmount / totalItemAmount) * invoiceTotalAmount;

                existing.paid += proportionalAmount;
                costCodeAmounts.set(costCodeUuid, existing);
              });
            } else if (invoiceTotalAmount > 0 && costCodeItemAmounts.size === 0) {
              // If there are no items with cost codes but invoice has an amount,
              // we can't distribute it, so skip this invoice
              // (This shouldn't happen in normal cases, but handle gracefully)
            }
          } catch (error) {
            // Silently handle error for individual invoice
          }
        }
      } catch (error) {
        // Silently handle error - if vendor invoices can't be fetched, paid amounts will be 0
      }

      // Build hierarchical structure by division
      // Show all cost codes that have any activity (budgeted, purchase orders, change orders, or paid amounts)
      const reportDivisions = divisions
        .map((division) => {
          // Helper function to recursively build cost code hierarchy
          const buildCostCodeHierarchy = (parentUuid: string | null): any[] => {
            const filteredCodes = allCostCodes.filter((cc) => {
              if (parentUuid === null) {
                return (
                  cc.division_uuid === division.uuid &&
                  !cc.parent_cost_code_uuid
                );
              }
              return cc.parent_cost_code_uuid === parentUuid;
            });

            return filteredCodes
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((costCode) => {
                // Get direct amounts for this cost code (not including children)
                const directAmounts = costCodeAmounts.get(
                  costCode.uuid || ""
                ) || {
                  budgeted: 0,
                  purchaseOrder: 0,
                  changeOrder: 0,
                  paid: 0,
                };

                // Get sub-cost codes recursively
                const subCostCodes = buildCostCodeHierarchy(
                  costCode.uuid || null
                );

                // Calculate totals including children (children already have their totals calculated)
                const subBudgeted = subCostCodes.reduce(
                  (sum, sc) => sum + sc.budgetedAmount,
                  0
                );
                const subPurchaseOrder = subCostCodes.reduce(
                  (sum, sc) => sum + sc.purchaseOrderAmount,
                  0
                );
                const subChangeOrder = subCostCodes.reduce(
                  (sum, sc) => sum + sc.changeOrderAmount,
                  0
                );
                const subPaid = subCostCodes.reduce(
                  (sum, sc) => sum + sc.paidAmount,
                  0
                );

                // Total = direct amount + children totals
                const totalBudgeted = directAmounts.budgeted + subBudgeted;
                const totalPurchaseOrder =
                  directAmounts.purchaseOrder + subPurchaseOrder;
                const totalChangeOrder =
                  directAmounts.changeOrder + subChangeOrder;
                // Total Amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
                const totalAmount = totalPurchaseOrder + totalChangeOrder;
                const totalPaid = directAmounts.paid + subPaid;
                // Budget Remaining = Budgeted Amount - Total Amount
                const budgetRemaining = totalBudgeted - totalAmount;
                const costPerRoom =
                  numberOfRooms > 0 ? totalAmount / numberOfRooms : 0;

                return {
                  uuid: costCode.uuid || "",
                  costCodeNumber: costCode.cost_code_number || "",
                  costCodeName: costCode.cost_code_name || "",
                  order: costCode.order || 0,
                  budgetedAmount: totalBudgeted,
                  purchaseOrderAmount: totalPurchaseOrder,
                  changeOrderAmount: totalChangeOrder,
                  totalAmount,
                  paidAmount: totalPaid,
                  budgetRemaining,
                  costPerRoom,
                  subCostCodes:
                    subCostCodes.length > 0 ? subCostCodes : undefined,
                };
              })
              .filter((costCode) => {
                // Include cost codes that have any activity:
                // - budgeted amounts (from estimates)
                // - purchase order amounts
                // - change order amounts
                // - paid amounts
                // Include parent cost codes if they have children with any activity
                return (
                  costCode.budgetedAmount > 0 ||
                  costCode.purchaseOrderAmount > 0 ||
                  costCode.changeOrderAmount > 0 ||
                  costCode.paidAmount > 0
                );
              });
          };

          const costCodesWithData = buildCostCodeHierarchy(null);

          // Include divisions that have cost codes with any activity
          if (costCodesWithData.length === 0) {
            return null as any; // Filter out divisions with no cost codes that have any activity
          }

          // Calculate division totals (cost codes already include their children in totals)
          const divisionTotalBudgeted = costCodesWithData.reduce(
            (sum, cc) => sum + cc.budgetedAmount,
            0
          );
          const divisionTotalPurchaseOrder = costCodesWithData.reduce(
            (sum, cc) => sum + cc.purchaseOrderAmount,
            0
          );
          const divisionTotalChangeOrder = costCodesWithData.reduce(
            (sum, cc) => sum + cc.changeOrderAmount,
            0
          );
          // Total Amount = Purchase Order Amount + Change Order Amount (excluding Budgeted Amount)
          const divisionTotalAmount =
            divisionTotalPurchaseOrder + divisionTotalChangeOrder;
          const divisionTotalPaid = costCodesWithData.reduce(
            (sum, cc) => sum + cc.paidAmount,
            0
          );
          // Budget Remaining = Budgeted Amount - Total Amount
          const divisionTotalRemaining =
            divisionTotalBudgeted - divisionTotalAmount;

          return {
            uuid: division.uuid || "",
            divisionNumber: division.division_number || "",
            divisionName: division.division_name || "",
            order: division.division_order || 0,
            excludeInEstimatesAndReports:
              division.exclude_in_estimates_and_reports === true,
            costCodes: costCodesWithData,
            totalBudgeted: divisionTotalBudgeted,
            totalPurchaseOrder: divisionTotalPurchaseOrder,
            totalChangeOrder: divisionTotalChangeOrder,
            totalAmount: divisionTotalAmount,
            totalPaid: divisionTotalPaid,
            totalRemaining: divisionTotalRemaining,
          };
        })
        .filter((division) => division !== null); // Remove null divisions

      // Calculate overall summary
      const summary = {
        totalBudgeted: reportDivisions.reduce(
          (sum, d) => sum + d.totalBudgeted,
          0
        ),
        totalPurchaseOrder: reportDivisions.reduce(
          (sum, d) => sum + d.totalPurchaseOrder,
          0
        ),
        totalChangeOrder: reportDivisions.reduce(
          (sum, d) => sum + d.totalChangeOrder,
          0
        ),
        totalAmount: reportDivisions.reduce((sum, d) => sum + d.totalAmount, 0),
        totalPaid: reportDivisions.reduce((sum, d) => sum + d.totalPaid, 0),
        totalRemaining: reportDivisions.reduce(
          (sum, d) => sum + d.totalRemaining,
          0
        ),
        costPerRoom:
          numberOfRooms > 0
            ? reportDivisions.reduce((sum, d) => sum + d.totalAmount, 0) /
              numberOfRooms
            : 0,
      };

      const result = {
        project: {
          uuid: project.uuid,
          projectName: project.project_name || "",
          projectId: project.project_id || "",
          numberOfRooms,
        },
        divisions: reportDivisions,
        summary,
      };

      return result;
    } catch (err: any) {
      error.value = err.message || "Failed to generate budget report";
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    generateBudgetReport
  }
}

