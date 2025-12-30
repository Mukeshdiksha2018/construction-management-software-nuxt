import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import { dbHelpers } from "@/utils/indexedDb";

export interface StockReturnNote {
  id?: number;
  uuid: string;
  corporation_uuid: string;
  project_uuid?: string | null;
  purchase_order_uuid?: string | null;
  change_order_uuid?: string | null;
  return_type?: 'purchase_order' | 'change_order';
  entry_date: string | null;
  return_number: string;
  reference_number?: string | null;
  returned_by?: string | null;
  location_uuid?: string | null;
  notes?: string | null;
  status: "Waiting" | "Returned";
  total_return_amount?: number | null;
  financial_breakdown?: Record<string, any> | null;
  attachments?: any[];
  metadata?: Record<string, any> | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStockReturnNotePayload
  extends Partial<StockReturnNote> {
  corporation_uuid: string;
  entry_date?: string | null;
}

export interface UpdateStockReturnNotePayload
  extends Partial<CreateStockReturnNotePayload> {
  uuid: string;
}

interface StockReturnNoteResponse {
  data: StockReturnNote;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasMore: boolean;
}

interface StockReturnNotesResponse {
  data: StockReturnNote[];
  pagination?: PaginationInfo;
  error?: string;
}

const compareNotes = (a: StockReturnNote, b: StockReturnNote) => {
  const getTime = (note: StockReturnNote) => {
    const primary = note.entry_date || null;
    const fallback = note.created_at || null;
    if (!primary && !fallback) return 0;
    return new Date(primary || fallback).getTime();
  };
  return getTime(b) - getTime(a);
};

const sortNotes = (notes: StockReturnNote[]) =>
  [...notes].sort(compareNotes);

const normalizeStatus = (status?: string | null): "Waiting" | "Returned" => {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "returned":
      return "Returned";
    case "waiting":
      return "Waiting";
    default:
      return "Waiting";
  }
};

export const useStockReturnNotesStore = defineStore(
  "stockReturnNotes",
  () => {
    const stockReturnNotes = ref<StockReturnNote[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastFetchedCorporation = ref<string | null>(null);
    const hasDataForCorporation = ref<Set<string>>(new Set());
    
    // Pagination state
    const paginationInfo = ref<Record<string, PaginationInfo>>({});
    const loadedPages = ref<Record<string, Set<number>>>({});

    const replaceCorporationNotes = (
      corporationUuid: string,
      notes: StockReturnNote[]
    ) => {
      const others = stockReturnNotes.value.filter(
        (note) => note.corporation_uuid !== corporationUuid
      );
      stockReturnNotes.value = sortNotes([...others, ...notes]);
    };

    const getNotesForCorporation = (corporationUuid: string) =>
      stockReturnNotes.value.filter(
        (note) => note.corporation_uuid === corporationUuid
      );

    const fetchFromIndexedDB = async (
      corporationUuid: string
    ): Promise<boolean> => {
      try {
        const cached = await dbHelpers.getStockReturnNotes(corporationUuid);
        if (!cached || cached.length === 0) {
          return false;
        }
        // Normalize return numbers from IndexedDB as well
        const normalizedCached = cached.map((note) => ({
          ...note,
          return_number: normalizeReturnNumber(note.return_number),
        }));
        replaceCorporationNotes(corporationUuid, sortNotes(normalizedCached));
        lastFetchedCorporation.value = corporationUuid;
        hasDataForCorporation.value.add(corporationUuid);
        return true;
      } catch (err: any) {
        console.error("[StockReturnNotes] IndexedDB load error:", err);
        return false;
      }
    };

    const fetchStockReturnNotes = async (
      corporationUuid: string,
      forceRefresh = false,
      page = 1,
      pageSize = 100,
      filters: { project_uuid?: string; vendor_uuid?: string } = {}
    ) => {
      if (!corporationUuid) {
        return;
      }

      const corpKey = corporationUuid;
      if (!loadedPages.value[corpKey]) {
        loadedPages.value[corpKey] = new Set();
      }

      // For first page or force refresh, check if we should use IndexedDB
      if (page === 1 && !forceRefresh) {
        await fetchFromIndexedDB(corporationUuid);
      }

      let shouldFetch = forceRefresh;
      if (!shouldFetch && page === 1) {
        const hasCached = hasDataForCorporation.value.has(corporationUuid);
        shouldFetch =
          !hasCached || lastFetchedCorporation.value !== corporationUuid;

        if (!shouldFetch) {
          shouldFetch = await dbHelpers.needsSync(
            corporationUuid,
            "stockReturnNotes",
            5
          );
        }
      } else if (!shouldFetch && page > 1) {
        // For subsequent pages, only fetch if not already loaded
        shouldFetch = !loadedPages.value[corpKey].has(page);
      }

      if (!shouldFetch) {
        return;
      }

      loading.value = true;
      error.value = null;
      try {
        // Build query string with filters
        const queryParams = new URLSearchParams({
          corporation_uuid: corporationUuid,
          page: page.toString(),
          page_size: pageSize.toString()
        });

        if (filters.project_uuid) {
          queryParams.append('project_uuid', filters.project_uuid);
        }
        if (filters.vendor_uuid) {
          queryParams.append('vendor_uuid', filters.vendor_uuid);
        }

        const response = await $fetch<
          StockReturnNotesResponse | StockReturnNote[] | { data?: StockReturnNote[]; pagination?: PaginationInfo }
        >(`/api/stock-return-notes?${queryParams.toString()}`);

        const notes = Array.isArray(response)
          ? response
          : Array.isArray((response as any)?.data)
          ? (response as StockReturnNotesResponse).data
          : [];

        // Normalize return numbers to simple format (RTN-1, RTN-2, etc.)
        const normalizedNotes = notes.map((note) => ({
          ...note,
          return_number: normalizeReturnNumber(note.return_number),
        }));

        // For first page, replace; for subsequent pages, merge
        if (page === 1) {
          const sorted = sortNotes(normalizedNotes);
          replaceCorporationNotes(corporationUuid, sorted);
          await dbHelpers.saveStockReturnNotes(corporationUuid, sorted);
        } else {
          const existingUuids = new Set(
            getNotesForCorporation(corporationUuid).map((n) => n.uuid)
          );
          const newNotes = normalizedNotes.filter(
            (note) => note.uuid && !existingUuids.has(note.uuid)
          );
          if (newNotes.length > 0) {
            const existing = getNotesForCorporation(corporationUuid);
            const sorted = sortNotes([...existing, ...newNotes]);
            replaceCorporationNotes(corporationUuid, sorted);
          }
        }

        // Store pagination info
        if ((response as any)?.pagination) {
          paginationInfo.value[corpKey] = (response as any).pagination;
        }

        // Mark this page as loaded
        loadedPages.value[corpKey].add(page);

        lastFetchedCorporation.value = corporationUuid;
        hasDataForCorporation.value.add(corporationUuid);
      } catch (err: any) {
        console.error("[StockReturnNotes] fetch error:", err);
        error.value =
          err?.statusMessage ||
          err?.message ||
          "Failed to fetch stock return notes";
      } finally {
        loading.value = false;
      }
    };

    const getPaginationInfo = (corporationUuid: string): PaginationInfo | null => {
      return paginationInfo.value[corporationUuid] || null;
    };

    const getNoteByUuid = (uuid: string) =>
      stockReturnNotes.value.find((note) => note.uuid === uuid) ?? null;

    const normalizeReturnNumber = (returnNumber: string | null | undefined): string => {
      if (!returnNumber) return '';
      // Extract numeric part and return in simple format: RTN-1, RTN-2, etc.
      const numericPart = String(returnNumber).replace(/^RTN-/i, '');
      const num = parseInt(numericPart, 10);
      if (Number.isNaN(num)) return returnNumber; // Return as-is if can't parse
      return `RTN-${num}`;
    };

    const generateNextReturnNumber = (corporationUuid: string): string => {
      const corpNotes = getNotesForCorporation(corporationUuid);
      let maxNum = 0;
      for (const note of corpNotes) {
        // Extract numeric part from both RTN-000001 and RTN-1 formats
        const returnNumber = String(note.return_number || '').replace(/^RTN-/i, '');
        const num = parseInt(returnNumber, 10);
        if (!Number.isNaN(num)) maxNum = Math.max(maxNum, num);
      }
      const next = maxNum + 1;
      // Generate in simple format: RTN-1, RTN-2, RTN-3, etc.
      return `RTN-${next}`;
    };

    const createStockReturnNote = async (
      payload: CreateStockReturnNotePayload
    ): Promise<StockReturnNote | null> => {
      if (!payload?.corporation_uuid) {
        throw new Error("corporation_uuid is required");
      }

      try {
        const response = await $fetch<StockReturnNoteResponse | StockReturnNote>(
          "/api/stock-return-notes",
          {
            method: "POST",
            body: payload,
          }
        );

        const newNote: StockReturnNote | null = (response as any)?.data ?? response ?? null;

        if (newNote) {
          // Normalize return number to simple format
          // Preserve ALL fields from API response (including flattened metadata fields like project_name, po_number, etc.)
          // The spread operator preserves all fields, including ones not in the TypeScript interface
          const normalizedNote = {
            ...newNote,
            return_number: normalizeReturnNumber(newNote.return_number),
            // Ensure metadata object exists and includes all flattened fields from API response
            metadata: {
              ...(newNote.metadata || {}),
              // Preserve flattened metadata fields from API response (these come from JOINs)
              ...((newNote as any).project_name ? { project_name: (newNote as any).project_name } : {}),
              ...((newNote as any).project_id ? { project_id: (newNote as any).project_id } : {}),
              ...((newNote as any).po_number ? { po_number: (newNote as any).po_number } : {}),
              ...((newNote as any).co_number ? { co_number: (newNote as any).co_number } : {}),
              ...((newNote as any).vendor_name ? { vendor_name: (newNote as any).vendor_name } : {}),
            },
          };
          const corpUuid = normalizedNote.corporation_uuid;
          const existing = getNotesForCorporation(corpUuid).filter(
            (note) => note.uuid !== normalizedNote.uuid
          );
          const updatedCorpNotes = sortNotes([normalizedNote, ...existing]);
          replaceCorporationNotes(corpUuid, updatedCorpNotes);
          // Save to IndexedDB with all fields preserved (including top-level flattened fields)
          await dbHelpers.addStockReturnNote(corpUuid, normalizedNote);
          lastFetchedCorporation.value = corpUuid;
          hasDataForCorporation.value.add(corpUuid);
        }

        // Return normalized note with all metadata preserved
        return newNote ? {
          ...newNote,
          return_number: normalizeReturnNumber(newNote.return_number),
        } : null;
      } catch (err: any) {
        console.error("[StockReturnNotes] create error:", err);
        const message =
          err?.statusMessage || err?.message || "Failed to create return note";
        error.value = message;
        throw new Error(message);
      }
    };

    const updateStockReturnNote = async (
      payload: UpdateStockReturnNotePayload
    ): Promise<StockReturnNote | null> => {
      if (!payload?.uuid) {
        throw new Error("uuid is required");
      }

      const existingNote = getNoteByUuid(payload.uuid);
      const corporationUuid =
        payload.corporation_uuid || existingNote?.corporation_uuid;

      if (!corporationUuid) {
        throw new Error("corporation_uuid is required for update");
      }

      try {
        const response = await $fetch<StockReturnNoteResponse | StockReturnNote>(
          "/api/stock-return-notes",
          {
            method: "PUT",
            body: payload,
          }
        );

        const updated: StockReturnNote | null = (response as any)?.data ?? response ?? null;
        if (!updated) {
          return null;
        }

        // Normalize return number to simple format
        // Preserve ALL fields from API response (including flattened metadata fields like project_name, po_number, etc.)
        // Merge with existing note metadata to ensure we don't lose any fields
        const existingMetadata = existingNote?.metadata || {};
        const normalizedUpdated = {
          ...updated,
          return_number: normalizeReturnNumber(updated.return_number),
          // Ensure metadata object exists and includes all flattened fields from API response
          metadata: {
            ...existingMetadata,
            ...(updated.metadata || {}),
            // Preserve flattened metadata fields from API response (these come from JOINs)
            ...((updated as any).project_name ? { project_name: (updated as any).project_name } : {}),
            ...((updated as any).project_id ? { project_id: (updated as any).project_id } : {}),
            ...((updated as any).po_number ? { po_number: (updated as any).po_number } : {}),
            ...((updated as any).co_number ? { co_number: (updated as any).co_number } : {}),
            ...((updated as any).vendor_name ? { vendor_name: (updated as any).vendor_name } : {}),
          },
        };

        const corpNotes = getNotesForCorporation(corporationUuid).filter(
          (note) => note.uuid !== normalizedUpdated.uuid
        );
        const updatedCorpNotes = sortNotes([normalizedUpdated, ...corpNotes]);
        replaceCorporationNotes(corporationUuid, updatedCorpNotes);
        // Save to IndexedDB with all fields preserved (including top-level flattened fields)
        await dbHelpers.updateStockReturnNote(corporationUuid, normalizedUpdated);
        lastFetchedCorporation.value = corporationUuid;
        hasDataForCorporation.value.add(corporationUuid);
        return normalizedUpdated;
      } catch (err: any) {
        console.error("[StockReturnNotes] update error:", err);
        const message =
          err?.statusMessage || err?.message || "Failed to update return note";
        error.value = message;
        throw new Error(message);
      }
    };

    const deleteStockReturnNote = async (uuid: string): Promise<boolean> => {
      if (!uuid) return false;

      const existing = getNoteByUuid(uuid);
      const corporationUuid = existing?.corporation_uuid;

      try {
        const { apiFetch } = useApiClient();
        await apiFetch("/api/stock-return-notes", {
          method: "DELETE",
          query: { uuid },
        });

        if (corporationUuid) {
          const corpNotes = getNotesForCorporation(corporationUuid).filter(
            (note) => note.uuid !== uuid
          );
          replaceCorporationNotes(corporationUuid, corpNotes);
          await dbHelpers.deleteStockReturnNote(corporationUuid, uuid);
        } else {
          stockReturnNotes.value = stockReturnNotes.value.filter(
            (note) => note.uuid !== uuid
          );
        }
        return true;
      } catch (err: any) {
        console.error("[StockReturnNotes] delete error:", err);
        const message =
          err?.statusMessage || err?.message || "Failed to delete return note";
        error.value = message;
        return false;
      }
    };

    const clearData = () => {
      stockReturnNotes.value = [];
      error.value = null;
      lastFetchedCorporation.value = null;
      hasDataForCorporation.value.clear();
    };

    const notesByStatus = computed(() => {
      const grouped: Record<string, StockReturnNote[]> = {};
      stockReturnNotes.value.forEach((note) => {
        const status = note.status ? normalizeStatus(note.status) : "Waiting";
        if (!grouped[status]) grouped[status] = [];
        grouped[status].push(note);
      });
      return grouped;
    });

    const notesByCorporation = computed(() => {
      const grouped: Record<string, StockReturnNote[]> = {};
      stockReturnNotes.value.forEach((note) => {
        if (!grouped[note.corporation_uuid]) {
          grouped[note.corporation_uuid] = [];
        }
        grouped[note.corporation_uuid].push(note);
      });
      return grouped;
    });

    return {
      stockReturnNotes: readonly(stockReturnNotes),
      loading: readonly(loading),
      error: readonly(error),
      paginationInfo: readonly(paginationInfo),
      fetchStockReturnNotes,
      getPaginationInfo,
      createStockReturnNote,
      updateStockReturnNote,
      deleteStockReturnNote,
      getNoteByUuid,
      generateNextReturnNumber,
      notesByStatus,
      notesByCorporation,
      clearData,
    };
  }
);

