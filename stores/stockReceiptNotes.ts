import { defineStore } from "pinia";
import { computed, readonly, ref } from "vue";
import { dbHelpers } from "@/utils/indexedDb";

export interface StockReceiptNote {
  id?: number;
  uuid: string;
  corporation_uuid: string;
  project_uuid?: string | null;
  purchase_order_uuid?: string | null;
  receipt_type?: 'purchase_order' | 'change_order';
  entry_date: string | null;
  grn_number: string;
  reference_number?: string | null;
  received_by?: string | null;
  location_uuid?: string | null;
  notes?: string | null;
  status: "Shipment" | "Received";
  total_received_amount?: number | null;
  attachments?: any[];
  metadata?: Record<string, any> | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStockReceiptNotePayload
  extends Partial<StockReceiptNote> {
  corporation_uuid: string;
  entry_date?: string | null;
}

export interface UpdateStockReceiptNotePayload
  extends Partial<CreateStockReceiptNotePayload> {
  uuid: string;
}

interface StockReceiptNoteResponse {
  data: StockReceiptNote;
  error?: string;
}

interface StockReceiptNotesResponse {
  data: StockReceiptNote[];
  error?: string;
}

const compareNotes = (a: StockReceiptNote, b: StockReceiptNote) => {
  const getTime = (note: StockReceiptNote) => {
    const primary = note.entry_date || null;
    const fallback = note.created_at || null;
    if (!primary && !fallback) return 0;
    return new Date(primary || fallback).getTime();
  };
  return getTime(b) - getTime(a);
};

const sortNotes = (notes: StockReceiptNote[]) =>
  [...notes].sort(compareNotes);

const normalizeStatus = (status?: string | null): "Shipment" | "Received" => {
  const normalized = String(status || "").trim().toLowerCase();
  switch (normalized) {
    case "received":
      return "Received";
    case "shipment":
      return "Shipment";
    default:
      return "Shipment";
  }
};

export const useStockReceiptNotesStore = defineStore(
  "stockReceiptNotes",
  () => {
    const stockReceiptNotes = ref<StockReceiptNote[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastFetchedCorporation = ref<string | null>(null);
    const hasDataForCorporation = ref<Set<string>>(new Set());

    const replaceCorporationNotes = (
      corporationUuid: string,
      notes: StockReceiptNote[]
    ) => {
      // Normalize all GRN numbers before storing
      const normalizedNotes = notes.map((note) => ({
        ...note,
        grn_number: normalizeGrnNumber(note.grn_number),
      }));
      const others = stockReceiptNotes.value.filter(
        (note) => note.corporation_uuid !== corporationUuid
      );
      stockReceiptNotes.value = sortNotes([...others, ...normalizedNotes]);
    };

    const getNotesForCorporation = (corporationUuid: string) =>
      stockReceiptNotes.value.filter(
        (note) => note.corporation_uuid === corporationUuid
      );

    const normalizeGrnNumber = (grnNumber: string | null | undefined): string => {
      if (!grnNumber) return '';
      // Extract numeric part and return in simple format: GRN-1, GRN-2, etc.
      const numericPart = String(grnNumber).replace(/^GRN-/i, '');
      const num = parseInt(numericPart, 10);
      if (Number.isNaN(num)) return grnNumber; // Return as-is if can't parse
      return `GRN-${num}`;
    };

    const fetchFromIndexedDB = async (
      corporationUuid: string
    ): Promise<boolean> => {
      try {
        const cached = await dbHelpers.getStockReceiptNotes(corporationUuid);
        if (!cached || cached.length === 0) {
          return false;
        }
        // Normalize GRN numbers from IndexedDB as well
        const normalizedCached = cached.map((note) => ({
          ...note,
          grn_number: normalizeGrnNumber(note.grn_number),
        }));
        replaceCorporationNotes(corporationUuid, sortNotes(normalizedCached));
        lastFetchedCorporation.value = corporationUuid;
        hasDataForCorporation.value.add(corporationUuid);
        return true;
      } catch (err: any) {
        console.error("[StockReceiptNotes] IndexedDB load error:", err);
        return false;
      }
    };

    const fetchStockReceiptNotes = async (
      corporationUuid: string,
      options: { force?: boolean; useIndexedDB?: boolean } = {}
    ) => {
      if (!corporationUuid) {
        return;
      }

      const { force = false, useIndexedDB = true } = options;

      if (useIndexedDB && !force) {
        await fetchFromIndexedDB(corporationUuid);
      }

      let shouldFetch = force;
      if (!shouldFetch) {
        const hasCached = hasDataForCorporation.value.has(corporationUuid);
        shouldFetch =
          !hasCached || lastFetchedCorporation.value !== corporationUuid;

        if (!shouldFetch) {
          shouldFetch = await dbHelpers.needsSync(
            corporationUuid,
            "stockReceiptNotes",
            5
          );
        }
      }

      if (!shouldFetch) {
        return;
      }

      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<
          StockReceiptNotesResponse | StockReceiptNote[] | { data?: StockReceiptNote[] }
        >(`/api/stock-receipt-notes?corporation_uuid=${corporationUuid}`);

        const notes = Array.isArray(response)
          ? response
          : Array.isArray((response as any)?.data)
          ? (response as StockReceiptNotesResponse).data
          : [];

        // Normalize GRN numbers to simple format (GRN-1, GRN-2, etc.)
        const normalizedNotes = notes.map((note) => ({
          ...note,
          grn_number: normalizeGrnNumber(note.grn_number),
        }));

        const sorted = sortNotes(normalizedNotes);
        replaceCorporationNotes(corporationUuid, sorted);
        lastFetchedCorporation.value = corporationUuid;
        hasDataForCorporation.value.add(corporationUuid);
        await dbHelpers.saveStockReceiptNotes(corporationUuid, sorted);
      } catch (err: any) {
        console.error("[StockReceiptNotes] fetch error:", err);
        error.value =
          err?.statusMessage ||
          err?.message ||
          "Failed to fetch stock receipt notes";
      } finally {
        loading.value = false;
      }
    };

    const getNoteByUuid = (uuid: string) =>
      stockReceiptNotes.value.find((note) => note.uuid === uuid) ?? null;

    const generateNextGrnNumber = (corporationUuid: string): string => {
      const corpNotes = getNotesForCorporation(corporationUuid);
      let maxNum = 0;
      for (const note of corpNotes) {
        // Extract numeric part from both GRN-000001 and GRN-1 formats
        const grnNumber = String(note.grn_number || '').replace(/^GRN-/i, '');
        const num = parseInt(grnNumber, 10);
        if (!Number.isNaN(num)) maxNum = Math.max(maxNum, num);
      }
      const next = maxNum + 1;
      // Generate in simple format: GRN-1, GRN-2, GRN-3, etc.
      return `GRN-${next}`;
    };

    const createStockReceiptNote = async (
      payload: CreateStockReceiptNotePayload
    ): Promise<StockReceiptNote | null> => {
      if (!payload?.corporation_uuid) {
        throw new Error("corporation_uuid is required");
      }

      try {
        const response = await $fetch<StockReceiptNoteResponse | StockReceiptNote>(
          "/api/stock-receipt-notes",
          {
            method: "POST",
            body: payload,
          }
        );

        const newNote: StockReceiptNote | null = (response as any)?.data ?? response ?? null;

        if (newNote) {
          // Normalize GRN number to simple format
          const normalizedNote = {
            ...newNote,
            grn_number: normalizeGrnNumber(newNote.grn_number),
          };
          const corpUuid = normalizedNote.corporation_uuid;
          const existing = getNotesForCorporation(corpUuid).filter(
            (note) => note.uuid !== normalizedNote.uuid
          );
          const updatedCorpNotes = sortNotes([normalizedNote, ...existing]);
          replaceCorporationNotes(corpUuid, updatedCorpNotes);
          await dbHelpers.addStockReceiptNote(corpUuid, normalizedNote);
          lastFetchedCorporation.value = corpUuid;
          hasDataForCorporation.value.add(corpUuid);
        }

        // Return normalized note if it exists
        return newNote ? {
          ...newNote,
          grn_number: normalizeGrnNumber(newNote.grn_number),
        } : null;
      } catch (err: any) {
        console.error("[StockReceiptNotes] create error:", err);
        const message =
          err?.statusMessage || err?.message || "Failed to create receipt note";
        error.value = message;
        throw new Error(message);
      }
    };

    const updateStockReceiptNote = async (
      payload: UpdateStockReceiptNotePayload
    ): Promise<StockReceiptNote | null> => {
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
        const response = await $fetch<StockReceiptNoteResponse | StockReceiptNote>(
          "/api/stock-receipt-notes",
          {
            method: "PUT",
            body: payload,
          }
        );

        const updated: StockReceiptNote | null = (response as any)?.data ?? response ?? null;
        if (!updated) {
          return null;
        }

        // Normalize GRN number to simple format
        const normalizedUpdated = {
          ...updated,
          grn_number: normalizeGrnNumber(updated.grn_number),
        };

        const corpNotes = getNotesForCorporation(corporationUuid).filter(
          (note) => note.uuid !== normalizedUpdated.uuid
        );
        const updatedCorpNotes = sortNotes([normalizedUpdated, ...corpNotes]);
        replaceCorporationNotes(corporationUuid, updatedCorpNotes);
        await dbHelpers.updateStockReceiptNote(corporationUuid, normalizedUpdated);
        lastFetchedCorporation.value = corporationUuid;
        hasDataForCorporation.value.add(corporationUuid);
        return normalizedUpdated;
      } catch (err: any) {
        console.error("[StockReceiptNotes] update error:", err);
        const message =
          err?.statusMessage || err?.message || "Failed to update receipt note";
        error.value = message;
        throw new Error(message);
      }
    };

    const deleteStockReceiptNote = async (uuid: string): Promise<boolean> => {
      if (!uuid) return false;

      const existing = getNoteByUuid(uuid);
      const corporationUuid = existing?.corporation_uuid;

      try {
        await $fetch("/api/stock-receipt-notes", {
          method: "DELETE",
          query: { uuid },
        });

        if (corporationUuid) {
          const corpNotes = getNotesForCorporation(corporationUuid).filter(
            (note) => note.uuid !== uuid
          );
          replaceCorporationNotes(corporationUuid, corpNotes);
          await dbHelpers.deleteStockReceiptNote(corporationUuid, uuid);
        } else {
          stockReceiptNotes.value = stockReceiptNotes.value.filter(
            (note) => note.uuid !== uuid
          );
        }
        return true;
      } catch (err: any) {
        console.error("[StockReceiptNotes] delete error:", err);
        const message =
          err?.statusMessage || err?.message || "Failed to delete receipt note";
        error.value = message;
        return false;
      }
    };

    const clearData = () => {
      stockReceiptNotes.value = [];
      error.value = null;
      lastFetchedCorporation.value = null;
      hasDataForCorporation.value.clear();
    };

    const notesByStatus = computed(() => {
      const grouped: Record<string, StockReceiptNote[]> = {};
      stockReceiptNotes.value.forEach((note) => {
        const status = note.status ? normalizeStatus(note.status) : "Shipment";
        if (!grouped[status]) grouped[status] = [];
        grouped[status].push(note);
      });
      return grouped;
    });

    const notesByCorporation = computed(() => {
      const grouped: Record<string, StockReceiptNote[]> = {};
      stockReceiptNotes.value.forEach((note) => {
        if (!grouped[note.corporation_uuid]) {
          grouped[note.corporation_uuid] = [];
        }
        grouped[note.corporation_uuid].push(note);
      });
      return grouped;
    });

    return {
      stockReceiptNotes: readonly(stockReceiptNotes),
      loading: readonly(loading),
      error: readonly(error),
      fetchStockReceiptNotes,
      createStockReceiptNote,
      updateStockReceiptNote,
      deleteStockReceiptNote,
      getNoteByUuid,
      generateNextGrnNumber,
      notesByStatus,
      notesByCorporation,
      clearData,
    };
  }
);

