export interface ProjectAddress {
  id: number;
  uuid: string;
  created_at: string;
  updated_at: string;
  project_uuid: string;
  address_type?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  is_primary: boolean;
  is_active: boolean;
  copied_from_billing_address_uuid?: string | null;
}

export interface CreateProjectAddressPayload {
  project_uuid: string;
  address_type?: string | null;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line_1: string;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  is_primary?: boolean;
  copied_from_billing_address_uuid?: string | null;
}

export interface UpdateProjectAddressPayload extends Partial<CreateProjectAddressPayload> {
  uuid: string;
  is_active?: boolean;
}

export const useProjectAddressesStore = defineStore(
  "projectAddresses",
  () => {
    const addressesByProject = ref<Record<string, ProjectAddress[]>>({});
    const loading = ref(false);
    const error = ref<string | null>(null);

    const getAddresses = (projectUuid: string) => {
      return addressesByProject.value[projectUuid] || [];
    };

    const fetchAddresses = async (projectUuid: string) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<{ data: ProjectAddress[]; error?: string }>(
          `/api/projects/addresses?project_uuid=${projectUuid}`
        );
        if ((response as any)?.error) throw new Error((response as any).error);
        addressesByProject.value[projectUuid] = response.data || [];
        return response.data;
      } catch (err: any) {
        error.value = err.message || "Failed to fetch addresses";
        addressesByProject.value[projectUuid] = [];
        return [];
      } finally {
        loading.value = false;
      }
    };

    const createAddress = async (payload: CreateProjectAddressPayload) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<{ data: ProjectAddress; error?: string }>(
          "/api/projects/addresses",
          { method: "POST", body: payload }
        );
        if ((response as any)?.error) throw new Error((response as any).error);
        const addr = response.data;
        const list = addressesByProject.value[payload.project_uuid] || [];
        // If primary, demote others
        if (addr.is_primary) {
          addressesByProject.value[payload.project_uuid] = [
            ...list.map((a) => ({ ...a, is_primary: false })),
          ];
        }
        addressesByProject.value[payload.project_uuid] = [addr, ...(addressesByProject.value[payload.project_uuid] || [])];
        return addr;
      } catch (err: any) {
        error.value = err.message || "Failed to create address";
        return null;
      } finally {
        loading.value = false;
      }
    };

    const updateAddress = async (payload: UpdateProjectAddressPayload) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<{ data: ProjectAddress; error?: string }>(
          "/api/projects/addresses",
          { method: "PUT", body: payload }
        );
        if ((response as any)?.error) throw new Error((response as any).error);
        const addr = response.data;
        const projectUuid = addr.project_uuid;
        const list = addressesByProject.value[projectUuid] || [];
        // If primary, demote others
        let updated = list.map((a) => (a.uuid === addr.uuid ? addr : a));
        if (addr.is_primary) {
          updated = updated.map((a) => (a.uuid === addr.uuid ? a : { ...a, is_primary: false }));
        }
        addressesByProject.value[projectUuid] = updated;
        return addr;
      } catch (err: any) {
        error.value = err.message || "Failed to update address";
        return null;
      } finally {
        loading.value = false;
      }
    };

    const deleteAddress = async (uuid: string, projectUuid: string) => {
      loading.value = true;
      error.value = null;
      try {
        const response = await $fetch<{ data: any; error?: string }>(
          "/api/projects/addresses",
          { method: "DELETE", query: { uuid } as any }
        );
        if ((response as any)?.error) throw new Error((response as any).error);
        addressesByProject.value[projectUuid] = (addressesByProject.value[projectUuid] || []).filter(
          (a) => a.uuid !== uuid
        );
        return true;
      } catch (err: any) {
        error.value = err.message || "Failed to delete address";
        return false;
      } finally {
        loading.value = false;
      }
    };

    return {
      addressesByProject,
      loading,
      error,
      getAddresses,
      fetchAddresses,
      createAddress,
      updateAddress,
      deleteAddress,
    };
  },
  {
    persist: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      paths: ["addressesByProject"],
    },
  }
);
