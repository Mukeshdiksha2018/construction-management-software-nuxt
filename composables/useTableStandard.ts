import { ref, computed, type Ref } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'

export function useTableStandard() {
  // Standard table state
  const sorting = ref([]);
  const pagination = ref({
    pageIndex: 0,
    pageSize: 10,
  });

  // Pagination options for TanStack Table
  const paginationOptions = ref({
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Standard pagination options
  const pageSizeOptions = [
    { label: "10 per page", value: 10 },
    { label: "25 per page", value: 25 },
    { label: "50 per page", value: 50 },
    { label: "100 per page", value: 100 },
  ];

  // Function to update page size in TanStack Table
  function updatePageSize(table: any) {
    if (table?.tableApi) {
      table.tableApi.setPageSize(pagination.value.pageSize);
    }
  }

  // Function to create sortable header
  function createSortableHeader(label: string, column: any) {
    const UButton = resolveComponent("UButton");
    const isSorted = column.getIsSorted();
    return h(UButton, {
      color: "neutral",
      variant: "ghost",
      label,
      icon: isSorted
        ? isSorted === "asc"
          ? "i-lucide-arrow-up-narrow-wide"
          : "i-lucide-arrow-down-wide-narrow"
        : "i-lucide-arrow-up-down",
      onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
    });
  }

  // Computed property to determine if pagination should be shown
  function shouldShowPagination(dataLength: Ref<number> | number) {
    const length =
      typeof dataLength === "number" ? dataLength : dataLength.value;
    return computed(() => length > 10);
  }

  // Standard pagination template props
  function getPaginationProps(table: any, dataType: string = "items") {
    return {
      "default-page":
        (table?.tableApi?.getState().pagination.pageIndex || 0) + 1,
      "items-per-page": table?.tableApi?.getState().pagination.pageSize,
      total: table?.tableApi?.getFilteredRowModel().rows.length,
      "onUpdate:page": (p: number) => table?.tableApi?.setPageIndex(p - 1),
    };
  }

  // Standard page info computed
  function getPageInfo(table: any, dataType: string = "items") {
    return computed(() => {
      const pageIndex = table?.tableApi?.getState().pagination.pageIndex || 0;
      const pageSize = table?.tableApi?.getState().pagination.pageSize || 10;
      const total = table?.tableApi?.getFilteredRowModel().rows.length || 0;
      const start = pageIndex * pageSize + 1;
      const end = Math.min((pageIndex + 1) * pageSize, total);
      return `Showing ${start} to ${end} of ${total} ${dataType}`;
    });
  }

  return {
    // Refs
    sorting,
    pagination,
    paginationOptions,

    // Constants
    pageSizeOptions,

    // Functions
    updatePageSize,
    createSortableHeader,
    shouldShowPagination,
    getPaginationProps,
    getPageInfo,
  };
}

// Helper function to create standard table columns with sortable headers
export function createSortableColumn(
  accessorKey: string,
  label: string,
  cellRenderer: (params: any) => any,
  options: { enableSorting?: boolean } = {},
  UButton?: any
): TableColumn<any> {
  return {
    accessorKey,
    header: ({ column }) => {
      const ButtonComponent = UButton || resolveComponent("UButton");
      const isSorted = column.getIsSorted();
      return h(ButtonComponent, {
        color: "neutral",
        variant: "ghost",
        label,
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: cellRenderer,
    enableSorting: options.enableSorting ?? true,
  };
}

// Helper function to create action column
export function createActionColumn(
  actions: Array<{
    icon: string;
    color: string;
    variant: string;
    onClick: (row: any) => void;
    class?: string;
  }>,
  UButton?: any
): TableColumn<any> {
  return {
    accessorKey: "actions",
    header: "Actions",
    enableSorting: false,
    cell: ({ row }) => {
      const ButtonComponent = UButton || resolveComponent("UButton");
      return h(
        "div",
        { class: "flex justify-end space-x-2" },
        actions.map((action) =>
          h(
            ButtonComponent,
            {
              icon: action.icon,
              size: "xs",
              variant: action.variant,
              color: action.color,
              class: action.class || "hover:scale-105 transition-transform",
              onClick: () => action.onClick(row.original),
            },
            () => ""
          )
        )
      );
    },
  };
}
