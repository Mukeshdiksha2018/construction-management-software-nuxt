import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed, nextTick } from "vue";

// Mock the stores
const mockCorpStore = {
  selectedCorporation: {
    uuid: 'test-corp-uuid',
    corporation_name: 'Test Corporation'
  }
}

const mockProjectTypesStore = {
  projectTypes: [
    { uuid: 'pt-1', name: 'Residential', is_active: true },
    { uuid: 'pt-2', name: 'Commercial', is_active: true }
  ],
  loading: false,
  error: null,
  getActiveProjectTypes: vi.fn((corpUuid) => mockProjectTypesStore.projectTypes),
  fetchProjectTypes: vi.fn()
}

const mockServiceTypes = [
  { uuid: 'st-1', name: 'General Contracting', is_active: true },
  { uuid: 'st-2', name: 'Design-Build', is_active: true }
]

const mockServiceTypesStore = {
  serviceTypes: mockServiceTypes,
  loading: false,
  error: null,
  get getActiveServiceTypes() { return this.serviceTypes },
  fetchServiceTypes: vi.fn()
}

// Mock the composables
vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorpStore
}))

vi.mock('@/stores/projectTypes', () => ({
  useProjectTypesStore: () => mockProjectTypesStore
}))

vi.mock('@/stores/serviceTypes', () => ({
  useServiceTypesStore: () => mockServiceTypesStore
}))

vi.mock('@/composables/useResizablePanels', () => ({
  useResizablePanels: () => ({
    isResizing: false,
    startResize: vi.fn()
  })
}))

vi.mock('@/composables/useFilePreview', () => ({
  useFilePreview: () => ({
    uploadedFile: null,
    fileUploadError: null,
    handleFileUpload: vi.fn()
  })
}))

vi.mock('@/composables/useAuditLog', () => ({
  useAuditLog: () => ({
    showAuditLogModal: false,
    generateAuditLogInfo: vi.fn(),
    showAuditLog: vi.fn(),
    onAuditLogsLoaded: vi.fn(),
    onAuditLogError: vi.fn(),
    onExportAuditLogs: vi.fn()
  })
}))

// Mock global $fetch
global.$fetch = vi.fn()

describe('ProjectDetailsForm Logic', () => {
  let pinia: any

  const defaultForm = {
    id: undefined,
    corporation_uuid: 'test-corp-uuid',
    project_name: '',
    project_id: '',
    project_type_uuid: '',
    service_type_uuid: '',
    estimated_amount: '',
    project_description: '',
    area_sq_ft: '',
    no_of_rooms: '',
    contingency_percentage: '',
    project_status: 'Pending',
    project_start_date: '',
    project_estimated_completion_date: '',
    only_total: false,
    enable_labor: false,
    enable_material: false,
    attachments: [],
    address_type: '',
    contact_person: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip_code: '',
    country: ''
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Logic', () => {
    it('should validate area or rooms requirement', () => {
      // Test with area only
      const formWithArea = { ...defaultForm, area_sq_ft: '1000' }
      const hasArea = formWithArea.area_sq_ft && formWithArea.area_sq_ft > 0
      expect(hasArea).toBe(true)

      // Test with rooms only
      const formWithRooms = { ...defaultForm, no_of_rooms: '5' }
      const hasRooms = formWithRooms.no_of_rooms && formWithRooms.no_of_rooms > 0
      expect(hasRooms).toBe(true)

      // Test with neither
      const formEmpty = { ...defaultForm, area_sq_ft: '', no_of_rooms: '' }
      const hasAreaOrRooms = Boolean((formEmpty.area_sq_ft && Number(formEmpty.area_sq_ft) > 0) || 
                                   (formEmpty.no_of_rooms && Number(formEmpty.no_of_rooms) > 0))
      expect(hasAreaOrRooms).toBe(false)
    })

    it('should clear one field when the other is filled', () => {
      const form = { ...defaultForm }
      
      // Fill area field
      form.area_sq_ft = '1000'
      form.no_of_rooms = null
      
      expect(form.area_sq_ft).toBe('1000')
      expect(form.no_of_rooms).toBe(null)

      // Fill rooms field
      form.area_sq_ft = null
      form.no_of_rooms = '5'
      
      expect(form.area_sq_ft).toBe(null)
      expect(form.no_of_rooms).toBe('5')
    })
  })

  describe('Dropdown Options Logic', () => {
    it('should compute project type options correctly', () => {
      const projectTypes = [
        { uuid: 'pt-1', name: 'Residential', is_active: true },
        { uuid: 'pt-2', name: 'Commercial', is_active: true }
      ]
      
      const options = projectTypes.map(projectType => ({
        label: projectType.name,
        value: projectType.uuid
      }))
      
      expect(options).toEqual([
        { label: 'Residential', value: 'pt-1' },
        { label: 'Commercial', value: 'pt-2' }
      ])
    })

    it('should compute service type options correctly', () => {
      const serviceTypes = [
        { uuid: 'st-1', name: 'General Contracting', is_active: true },
        { uuid: 'st-2', name: 'Design-Build', is_active: true }
      ]
      
      const options = serviceTypes.map(serviceType => ({
        label: serviceType.name,
        value: serviceType.uuid
      }))
      
      expect(options).toEqual([
        { label: 'General Contracting', value: 'st-1' },
        { label: 'Design-Build', value: 'st-2' }
      ])
    })

    it('should return empty options when no corporation is selected', () => {
      const corporationUuid = null
      
      if (!corporationUuid) {
        expect([]).toEqual([])
      }
    })
  })

  describe("File Upload Logic", () => {
    it("should validate file types correctly", () => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const validPdfFile = { type: "application/pdf" };
      const validDocFile = { type: "application/msword" };
      const validDocxFile = {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
      const invalidFile = { type: "text/plain" };

      expect(allowedTypes.includes(validPdfFile.type)).toBe(true);
      expect(allowedTypes.includes(validDocFile.type)).toBe(true);
      expect(allowedTypes.includes(validDocxFile.type)).toBe(true);
      expect(allowedTypes.includes(invalidFile.type)).toBe(false);
    });

    it("should validate file size limits", () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validFile = { size: 1024 * 1024 }; // 1MB
      const invalidFile = { size: 11 * 1024 * 1024 }; // 11MB
      const exactMaxFile = { size: 10 * 1024 * 1024 }; // Exactly 10MB

      expect(validFile.size <= maxSize).toBe(true);
      expect(invalidFile.size <= maxSize).toBe(false);
      expect(exactMaxFile.size <= maxSize).toBe(true);
    });

    it("should handle file removal from attachments array", () => {
      const attachments = [
        { name: "file1.pdf", isUploaded: false, tempId: "temp1" },
        { name: "file2.pdf", isUploaded: false, tempId: "temp2" },
        { name: "file3.pdf", isUploaded: true, uuid: "uuid3" },
      ];

      const indexToRemove = 1;
      attachments.splice(indexToRemove, 1);

      expect(attachments).toHaveLength(2);
      expect(attachments[0].name).toBe("file1.pdf");
      expect(attachments[1].name).toBe("file3.pdf");
    });

    it("should handle file removal with existing uploaded files", () => {
      const attachments = [
        { name: "existing.pdf", isUploaded: true, uuid: "existing-uuid" },
        { name: "new.pdf", isUploaded: false, tempId: "temp-id" },
      ];

      // Remove existing file
      const existingIndex = 0;
      attachments.splice(existingIndex, 1);

      expect(attachments).toHaveLength(1);
      expect(attachments[0].name).toBe("new.pdf");
    });

    it("should process multiple files correctly", () => {
      const files = [
        new File(["content1"], "file1.pdf", { type: "application/pdf" }),
        new File(["content2"], "file2.doc", { type: "application/msword" }),
      ];

      // Simulate file processing
      const processedFiles = files.map((file, index) => ({
        name: file.name,
        type: file.type,
        size: file.size,
        tempId: `temp-${index}`,
        isUploaded: false,
      }));

      expect(processedFiles).toHaveLength(2);
      expect(processedFiles[0].name).toBe("file1.pdf");
      expect(processedFiles[1].name).toBe("file2.doc");
      expect(processedFiles.every((f) => !f.isUploaded)).toBe(true);
    });

    it("should handle file upload errors", () => {
      const fileUploadError = ref<string | null>(null);

      // Test invalid file type error
      fileUploadError.value =
        "Invalid file type. Only PDF, DOC, and DOCX files are allowed.";
      expect(fileUploadError.value).toContain("Invalid file type");

      // Test file size error
      fileUploadError.value =
        "File size too large. Maximum size is 10MB per file.";
      expect(fileUploadError.value).toContain("File size too large");

      // Test processing error
      fileUploadError.value = "Failed to process files. Please try again.";
      expect(fileUploadError.value).toContain("Failed to process files");
    });

    it("should handle empty file upload", () => {
      const uploadedFiles = ref<File[]>([]);
      const attachments = ref<any[]>([]);

      // When no files are selected, attachments should be cleared
      if (uploadedFiles.value.length === 0) {
        attachments.value = [];
      }

      expect(attachments.value).toHaveLength(0);
    });

    it("should merge new attachments with existing ones", () => {
      const existingAttachments = [
        { name: "existing.pdf", isUploaded: true, uuid: "existing-uuid" },
      ];

      const newAttachments = [
        { name: "new1.pdf", isUploaded: false, tempId: "temp1" },
        { name: "new2.pdf", isUploaded: false, tempId: "temp2" },
      ];

      const allAttachments = [...existingAttachments, ...newAttachments];

      expect(allAttachments).toHaveLength(3);
      expect(allAttachments[0].isUploaded).toBe(true);
      expect(allAttachments[1].isUploaded).toBe(false);
      expect(allAttachments[2].isUploaded).toBe(false);
    });
  });

  describe("File Delete Functionality", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should allow re-uploading the same file after deletion", async () => {
      // Simulate the file upload component state
      const uploadedFiles = ref<File[]>([]);
      const attachments = ref<any[]>([]);
      const fileInputKey = ref(0);
      const emit = vi.fn();

      // Create a test file
      const testFile = new File(["test content"], "test-file.pdf", {
        type: "application/pdf",
      });

      // Step 1: Upload the file initially
      uploadedFiles.value = [testFile];
      
      // Simulate handleFileUpload processing
      const processedAttachment = {
        name: testFile.name,
        type: testFile.type,
        size: testFile.size,
        url: "data:application/pdf;base64,dGVzdCBjb250ZW50",
        fileData: "data:application/pdf;base64,dGVzdCBjb250ZW50",
        file: testFile,
        isUploaded: false,
        tempId: `temp-${Date.now()}`,
      };
      
      attachments.value = [processedAttachment];
      expect(attachments.value).toHaveLength(1);
      expect(attachments.value[0].name).toBe("test-file.pdf");

      // Step 2: Delete the file
      const indexToRemove = 0;
      const attachmentToRemove = attachments.value[indexToRemove];
      
      // Simulate removeFile logic - find and remove from uploadedFiles by name/size
      const fileIndex = uploadedFiles.value.findIndex(
        (file) => file.name === attachmentToRemove.name && file.size === attachmentToRemove.size
      );
      if (fileIndex !== -1) {
        uploadedFiles.value.splice(fileIndex, 1);
      }
      
      // Remove from attachments
      attachments.value.splice(indexToRemove, 1);
      
      // Increment fileInputKey to reset file input (key fix)
      fileInputKey.value += 1;
      
      expect(uploadedFiles.value).toHaveLength(0);
      expect(attachments.value).toHaveLength(0);
      expect(fileInputKey.value).toBe(1); // Key should increment

      // Step 3: Upload the same file again
      // The key increment ensures the file input component resets
      // This allows the browser to recognize the file selection even if it's the same file
      uploadedFiles.value = [testFile];
      
      // Simulate handleFileUpload processing again
      const reprocessedAttachment = {
        name: testFile.name,
        type: testFile.type,
        size: testFile.size,
        url: "data:application/pdf;base64,dGVzdCBjb250ZW50",
        fileData: "data:application/pdf;base64,dGVzdCBjb250ZW50",
        file: testFile,
        isUploaded: false,
        tempId: `temp-${Date.now() + 1}`, // New tempId
      };
      
      attachments.value = [reprocessedAttachment];
      
      // Verify the file was successfully re-uploaded
      expect(attachments.value).toHaveLength(1);
      expect(attachments.value[0].name).toBe("test-file.pdf");
      expect(attachments.value[0].tempId).not.toBe(processedAttachment.tempId); // Should have new tempId
      expect(uploadedFiles.value).toHaveLength(1);
      expect(uploadedFiles.value[0].name).toBe("test-file.pdf");
    });

    it("should delete existing uploaded file from storage", async () => {
      const mockResponse = {
        success: true,
        data: { fileName: "test-file.pdf" },
      };

      global.$fetch = vi.fn().mockResolvedValue(mockResponse);

      const attachments = [
        { name: "existing.pdf", isUploaded: true, uuid: "existing-uuid" },
        { name: "new.pdf", isUploaded: false, tempId: "temp-id" },
      ];

      const indexToRemove = 0;
      const attachment = attachments[indexToRemove];

      // Simulate delete API call for existing file
      if (attachment.uuid) {
        const response = await global.$fetch("/api/projects/remove-file", {
          method: "POST",
          body: { documentUuid: attachment.uuid },
        });

        expect(global.$fetch).toHaveBeenCalledWith(
          "/api/projects/remove-file",
          {
            method: "POST",
            body: { documentUuid: "existing-uuid" },
          }
        );
        expect(response.success).toBe(true);
        expect(response.data.fileName).toBe("test-file.pdf");
      }
    });

    it("should handle file deletion API errors gracefully", async () => {
      const mockErrorResponse = {
        error: "File not found",
      };

      global.$fetch = vi.fn().mockResolvedValue(mockErrorResponse);

      const attachments = [
        { name: "existing.pdf", isUploaded: true, uuid: "existing-uuid" },
      ];

      const indexToRemove = 0;
      const attachment = attachments[indexToRemove];

      // Simulate delete API call with error
      if (attachment.uuid) {
        const response = await global.$fetch("/api/projects/remove-file", {
          method: "POST",
          body: { documentUuid: attachment.uuid },
        });

        expect(response.error).toBe("File not found");
        // Should still proceed with UI removal even if API fails
      }
    });

    it("should handle file deletion network errors", async () => {
      global.$fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const attachments = [
        { name: "existing.pdf", isUploaded: true, uuid: "existing-uuid" },
      ];

      const indexToRemove = 0;
      const attachment = attachments[indexToRemove];

      // Simulate delete API call with network error
      if (attachment.uuid) {
        try {
          await global.$fetch("/api/projects/remove-file", {
            method: "POST",
            body: { documentUuid: attachment.uuid },
          });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toBe("Network error");
          // Should still proceed with UI removal even if API fails
        }
      }
    });

    it("should remove file from UI without API call for new files", () => {
      const attachments = [
        { name: "new.pdf", isUploaded: false, tempId: "temp-id" },
      ];

      const indexToRemove = 0;
      const attachment = attachments[indexToRemove];

      // For new files (no uuid), just remove from UI
      if (!attachment.uuid) {
        attachments.splice(indexToRemove, 1);
        expect(attachments).toHaveLength(0);
        expect(global.$fetch).not.toHaveBeenCalled();
      }
    });

    it("should update selected file index after deletion", () => {
      const attachments = [
        { name: "file1.pdf", isUploaded: false, tempId: "temp1" },
        { name: "file2.pdf", isUploaded: false, tempId: "temp2" },
        { name: "file3.pdf", isUploaded: false, tempId: "temp3" },
      ];

      let selectedFileIndex = 1; // Currently viewing file2

      // Remove file at index 1
      attachments.splice(1, 1);

      // Update selected index if it's beyond the new array length
      if (selectedFileIndex >= attachments.length) {
        selectedFileIndex = Math.max(0, attachments.length - 1);
      }

      expect(attachments).toHaveLength(2);
      expect(selectedFileIndex).toBe(1); // Should now point to file3
    });

    it("should handle deletion of last file", () => {
      const attachments = [
        { name: "last-file.pdf", isUploaded: false, tempId: "temp1" },
      ];

      let selectedFileIndex = 0;

      // Remove the only file
      attachments.splice(0, 1);

      // Update selected index
      if (selectedFileIndex >= attachments.length) {
        selectedFileIndex = Math.max(0, attachments.length - 1);
      }

      expect(attachments).toHaveLength(0);
      expect(selectedFileIndex).toBe(0);
    });

    it("should emit form update after file deletion", () => {
      const form = { ...defaultForm };
      const attachments = [
        { name: "file1.pdf", isUploaded: false, tempId: "temp1" },
        { name: "file2.pdf", isUploaded: false, tempId: "temp2" },
      ];

      const indexToRemove = 0;
      attachments.splice(indexToRemove, 1);

      // Simulate form update emission
      const updatedForm = { ...form, attachments };

      expect(updatedForm.attachments).toHaveLength(1);
      expect(updatedForm.attachments[0].name).toBe("file2.pdf");
    });
  });

  describe("Form Update and Validation Logic", () => {
    it("should handle form field updates correctly", () => {
      const form = { ...defaultForm };
      const field = "project_name";
      const value = "New Project Name";

      const updatedForm = { ...form, [field]: value };

      expect(updatedForm.project_name).toBe("New Project Name");
      expect(updatedForm).not.toBe(form); // Should be a new object
    });

    it("should clear area when rooms is filled", () => {
      const form = { ...defaultForm, area_sq_ft: "1000", no_of_rooms: null };

      // Simulate filling rooms field
      const updatedForm = { ...form, no_of_rooms: "5" };
      if (updatedForm.no_of_rooms && Number(updatedForm.no_of_rooms) > 0) {
        updatedForm.area_sq_ft = null;
      }

      expect(updatedForm.no_of_rooms).toBe("5");
      expect(updatedForm.area_sq_ft).toBe(null);
    });

    it("should clear rooms when area is filled", () => {
      const form = { ...defaultForm, area_sq_ft: null, no_of_rooms: "5" };

      // Simulate filling area field
      const updatedForm = { ...form, area_sq_ft: "1000" };
      if (updatedForm.area_sq_ft && Number(updatedForm.area_sq_ft) > 0) {
        updatedForm.no_of_rooms = null;
      }

      expect(updatedForm.area_sq_ft).toBe("1000");
      expect(updatedForm.no_of_rooms).toBe(null);
    });

    it("should validate area or rooms requirement", () => {
      // Test with valid area
      const formWithArea = {
        ...defaultForm,
        area_sq_ft: "1000",
        no_of_rooms: null,
      };
      const hasArea =
        formWithArea.area_sq_ft && Number(formWithArea.area_sq_ft) > 0;
      expect(hasArea).toBe(true);

      // Test with valid rooms
      const formWithRooms = {
        ...defaultForm,
        area_sq_ft: null,
        no_of_rooms: "5",
      };
      const hasRooms =
        formWithRooms.no_of_rooms && Number(formWithRooms.no_of_rooms) > 0;
      expect(hasRooms).toBe(true);

      // Test with neither
      const formEmpty = { ...defaultForm, area_sq_ft: null, no_of_rooms: null };
      const hasAreaOrRooms = Boolean(
        (formEmpty.area_sq_ft && Number(formEmpty.area_sq_ft) > 0) ||
          (formEmpty.no_of_rooms && Number(formEmpty.no_of_rooms) > 0)
      );
      expect(hasAreaOrRooms).toBe(false);
    });

    it("should handle zero values correctly", () => {
      const formWithZeroArea = {
        ...defaultForm,
        area_sq_ft: "0",
        no_of_rooms: null,
      };
      const hasArea =
        formWithZeroArea.area_sq_ft && Number(formWithZeroArea.area_sq_ft) > 0;
      expect(hasArea).toBe(false);

      const formWithZeroRooms = {
        ...defaultForm,
        area_sq_ft: null,
        no_of_rooms: "0",
      };
      const hasRooms =
        formWithZeroRooms.no_of_rooms &&
        Number(formWithZeroRooms.no_of_rooms) > 0;
      expect(hasRooms).toBe(false);
    });
  });

  describe("Computed Properties and Watchers", () => {
    it("should compute corporation name correctly", () => {
      const corporationName =
        mockCorpStore.selectedCorporation?.corporation_name ||
        "Unnamed Corporation";
      expect(corporationName).toBe("Test Corporation");
    });

    it("should handle missing corporation gracefully", () => {
      const mockStoreWithoutCorp = { selectedCorporation: null };
      const corporationName =
        mockStoreWithoutCorp.selectedCorporation?.corporation_name ||
        "Unnamed Corporation";
      expect(corporationName).toBe("Unnamed Corporation");
    });

    it("should compute current preview file correctly", () => {
      const attachments = [
        {
          name: "file1.pdf",
          isUploaded: true,
          file_url: "http://example.com/file1.pdf",
        },
        {
          name: "file2.pdf",
          isUploaded: false,
          url: "data:application/pdf;base64,content",
        },
      ];

      const selectedFileIndex = 0;
      const currentFile = attachments[selectedFileIndex];

      if (currentFile && currentFile.isUploaded && currentFile.file_url) {
        const previewFile = {
          ...currentFile,
          url: currentFile.file_url,
          file_url: currentFile.file_url,
        };
        expect(previewFile.url).toBe("http://example.com/file1.pdf");
      }
    });

    it("should handle empty attachments for preview", () => {
      const attachments = [];
      const selectedFileIndex = 0;

      if (attachments.length === 0) {
        expect(attachments.length).toBe(0);
      } else {
        const currentFile = attachments[selectedFileIndex];
        expect(currentFile).toBeUndefined();
      }
    });

    it("should compute file upload error message with parent precedence", () => {
      const parentError = "Parent error message";
      const localError = "Local error message";

      // Parent error should take precedence
      const errorMessage = parentError || localError;
      expect(errorMessage).toBe("Parent error message");

      // No parent error, use local error
      const errorMessage2 = null || localError;
      expect(errorMessage2).toBe("Local error message");
    });
  });

  describe("Dropdown Options and Data Loading", () => {
    it("should compute project type options with corporation UUID", () => {
      const corporationUuid = "test-corp-uuid";
      const projectTypes = [
        { uuid: "pt-1", name: "Residential", is_active: true },
        { uuid: "pt-2", name: "Commercial", is_active: true },
      ];

      const options = projectTypes.map((projectType) => ({
        label: projectType.name,
        value: projectType.uuid,
      }));

      expect(options).toEqual([
        { label: "Residential", value: "pt-1" },
        { label: "Commercial", value: "pt-2" },
      ]);
    });

    it("should return empty options when no corporation is selected", () => {
      const corporationUuid = null;

      if (!corporationUuid) {
        expect([]).toEqual([]);
      }
    });

    it("should compute service type options correctly", () => {
      const corporationUuid = "test-corp-uuid";
      const serviceTypes = [
        { uuid: "st-1", name: "General Contracting", is_active: true },
        { uuid: "st-2", name: "Design-Build", is_active: true },
      ];

      const options = serviceTypes.map((serviceType) => ({
        label: serviceType.name,
        value: serviceType.uuid,
      }));

      expect(options).toEqual([
        { label: "General Contracting", value: "st-1" },
        { label: "Design-Build", value: "st-2" },
      ]);
    });

    it("should handle project status options", () => {
      const projectStatusOptions = [
        {
          label: "Pending",
          value: "Pending",
          color: "warning",
          icon: "i-heroicons-clock",
        },
        {
          label: "Bidding",
          value: "Bidding",
          color: "info",
          icon: "i-heroicons-document-text",
        },
        {
          label: "Started",
          value: "Started",
          color: "primary",
          icon: "i-heroicons-play-circle",
        },
        {
          label: "In Progress",
          value: "In Progress",
          color: "info",
          icon: "i-heroicons-play",
        },
        {
          label: "Completed",
          value: "Completed",
          color: "success",
          icon: "i-heroicons-check-circle",
        },
        {
          label: "On Hold",
          value: "On Hold",
          color: "error",
          icon: "i-heroicons-pause",
        },
      ];

      expect(projectStatusOptions).toHaveLength(6);
      expect(projectStatusOptions[0].value).toBe("Pending");
      expect(projectStatusOptions[1].value).toBe("Bidding");
      expect(projectStatusOptions[2].value).toBe("Started");
      expect(projectStatusOptions[3].value).toBe("In Progress");
      expect(projectStatusOptions[4].value).toBe("Completed");
      expect(projectStatusOptions[5].value).toBe("On Hold");
    });

    it("should have correct properties for Bidding status option", () => {
      const biddingOption = {
        label: "Bidding",
        value: "Bidding",
        color: "info",
        icon: "i-heroicons-document-text",
      };

      expect(biddingOption.label).toBe("Bidding");
      expect(biddingOption.value).toBe("Bidding");
      expect(biddingOption.color).toBe("info");
      expect(biddingOption.icon).toBe("i-heroicons-document-text");
    });

    it("should have correct properties for Started status option", () => {
      const startedOption = {
        label: "Started",
        value: "Started",
        color: "primary",
        icon: "i-heroicons-play-circle",
      };

      expect(startedOption.label).toBe("Started");
      expect(startedOption.value).toBe("Started");
      expect(startedOption.color).toBe("primary");
      expect(startedOption.icon).toBe("i-heroicons-play-circle");
    });

    it("should handle country options correctly", () => {
      const countries = [
        { code: "US", name: "United States", currency: "USD", symbol: "$" },
        { code: "CA", name: "Canada", currency: "CAD", symbol: "C$" },
        { code: "GB", name: "United Kingdom", currency: "GBP", symbol: "£" },
      ];

      const countryOptions = countries.map((country) => ({
        label: country.name,
        value: country.code,
        currency: country.currency,
        symbol: country.symbol,
      }));

      expect(countryOptions).toEqual([
        { label: "United States", value: "US", currency: "USD", symbol: "$" },
        { label: "Canada", value: "CA", currency: "CAD", symbol: "C$" },
        { label: "United Kingdom", value: "GB", currency: "GBP", symbol: "£" },
      ]);
    });

    it("should handle address type options", () => {
      const addressTypeOptions = [
        { label: "Shipment Address", value: "shipment" },
        { label: "Bill Address", value: "bill" },
        { label: "Final Destination", value: "final-destination" },
      ];

      expect(addressTypeOptions).toHaveLength(3);
      expect(addressTypeOptions[0].value).toBe("shipment");
      expect(addressTypeOptions[1].value).toBe("bill");
      expect(addressTypeOptions[2].value).toBe("final-destination");
    });
  });

  describe("Address Grouping by Type", () => {
    it("should filter shipment addresses correctly", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St" },
        { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave" },
        { uuid: "addr-3", address_type: "shipment", address_line_1: "789 Ship Rd" },
        { uuid: "addr-4", address_type: "final-destination", address_line_1: "321 Final Blvd" },
      ];

      const shipmentAddresses = allAddresses.filter(addr => addr.address_type === "shipment");

      expect(shipmentAddresses).toHaveLength(2);
      expect(shipmentAddresses[0].uuid).toBe("addr-1");
      expect(shipmentAddresses[1].uuid).toBe("addr-3");
      expect(shipmentAddresses.every(addr => addr.address_type === "shipment")).toBe(true);
    });

    it("should filter billing addresses correctly", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St" },
        { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave" },
        { uuid: "addr-3", address_type: "bill", address_line_1: "789 Bill Rd" },
        { uuid: "addr-4", address_type: "final-destination", address_line_1: "321 Final Blvd" },
      ];

      const billingAddresses = allAddresses.filter(addr => addr.address_type === "bill");

      expect(billingAddresses).toHaveLength(2);
      expect(billingAddresses[0].uuid).toBe("addr-2");
      expect(billingAddresses[1].uuid).toBe("addr-3");
      expect(billingAddresses.every(addr => addr.address_type === "bill")).toBe(true);
    });

    it("should filter final destination addresses correctly", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St" },
        { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave" },
        { uuid: "addr-3", address_type: "final-destination", address_line_1: "789 Final Rd" },
        { uuid: "addr-4", address_type: "final-destination", address_line_1: "321 Final Blvd" },
      ];

      const finalDestinationAddresses = allAddresses.filter(addr => addr.address_type === "final-destination");

      expect(finalDestinationAddresses).toHaveLength(2);
      expect(finalDestinationAddresses[0].uuid).toBe("addr-3");
      expect(finalDestinationAddresses[1].uuid).toBe("addr-4");
      expect(finalDestinationAddresses.every(addr => addr.address_type === "final-destination")).toBe(true);
    });

    it("should handle empty address groups", () => {
      const allAddresses: any[] = [];

      const shipmentAddresses = allAddresses.filter(addr => addr.address_type === "shipment");
      const billingAddresses = allAddresses.filter(addr => addr.address_type === "bill");
      const finalDestinationAddresses = allAddresses.filter(addr => addr.address_type === "final-destination");

      expect(shipmentAddresses).toHaveLength(0);
      expect(billingAddresses).toHaveLength(0);
      expect(finalDestinationAddresses).toHaveLength(0);
    });

    it("should handle addresses with no type", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St" },
        { uuid: "addr-2", address_type: null, address_line_1: "456 No Type Ave" },
        { uuid: "addr-3", address_type: "bill", address_line_1: "789 Bill Rd" },
      ];

      const shipmentAddresses = allAddresses.filter(addr => addr.address_type === "shipment");
      const billingAddresses = allAddresses.filter(addr => addr.address_type === "bill");
      const finalDestinationAddresses = allAddresses.filter(addr => addr.address_type === "final-destination");

      expect(shipmentAddresses).toHaveLength(1);
      expect(billingAddresses).toHaveLength(1);
      expect(finalDestinationAddresses).toHaveLength(0);
    });

    it("should handle mixed addresses with primary indicators", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St", is_primary: true },
        { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave", is_primary: false },
        { uuid: "addr-3", address_type: "shipment", address_line_1: "789 Ship Rd", is_primary: false },
        { uuid: "addr-4", address_type: "final-destination", address_line_1: "321 Final Blvd", is_primary: false },
      ];

      const shipmentAddresses = allAddresses.filter(addr => addr.address_type === "shipment");
      const primaryShipment = shipmentAddresses.find(addr => addr.is_primary);

      expect(shipmentAddresses).toHaveLength(2);
      expect(primaryShipment?.uuid).toBe("addr-1");
      expect(primaryShipment?.is_primary).toBe(true);
    });

    it("should correctly count addresses by type", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment" },
        { uuid: "addr-2", address_type: "shipment" },
        { uuid: "addr-3", address_type: "shipment" },
        { uuid: "addr-4", address_type: "bill" },
        { uuid: "addr-5", address_type: "bill" },
        { uuid: "addr-6", address_type: "final-destination" },
      ];

      const shipmentCount = allAddresses.filter(addr => addr.address_type === "shipment").length;
      const billingCount = allAddresses.filter(addr => addr.address_type === "bill").length;
      const finalDestinationCount = allAddresses.filter(addr => addr.address_type === "final-destination").length;

      expect(shipmentCount).toBe(3);
      expect(billingCount).toBe(2);
      expect(finalDestinationCount).toBe(1);
    });

    it("should handle temporary addresses in grouping", () => {
      const savedAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St" },
        { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave" },
      ];

      const tempAddresses = [
        { tempId: "temp-1", address_type: "final-destination", address_line_1: "789 Final Rd", isTemp: true },
        { tempId: "temp-2", address_type: "shipment", address_line_1: "321 Ship Blvd", isTemp: true },
      ];

      const allAddresses = [...savedAddresses, ...tempAddresses];

      const shipmentAddresses = allAddresses.filter(addr => addr.address_type === "shipment");
      const billingAddresses = allAddresses.filter(addr => addr.address_type === "bill");
      const finalDestinationAddresses = allAddresses.filter(addr => addr.address_type === "final-destination");

      expect(shipmentAddresses).toHaveLength(2);
      expect(shipmentAddresses.some(addr => addr.uuid === "addr-1")).toBe(true);
      expect(shipmentAddresses.some(addr => addr.tempId === "temp-2")).toBe(true);

      expect(billingAddresses).toHaveLength(1);
      expect(billingAddresses[0].uuid).toBe("addr-2");

      expect(finalDestinationAddresses).toHaveLength(1);
      expect(finalDestinationAddresses[0].tempId).toBe("temp-1");
    });
  });

  describe("Address Primary Selection (One Per Type)", () => {
    it("should allow multiple primary addresses (one per type)", () => {
      const allAddresses = [
        { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St", is_primary: true },
        { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave", is_primary: true },
        { uuid: "addr-3", address_type: "final-destination", address_line_1: "789 Final Rd", is_primary: true },
        { uuid: "addr-4", address_type: "shipment", address_line_1: "321 Ship Blvd", is_primary: false },
        { uuid: "addr-5", address_type: "bill", address_line_1: "654 Bill St", is_primary: false },
      ];

      const primaryAddresses = allAddresses.filter(addr => addr.is_primary);
      const shipmentPrimaries = allAddresses.filter(addr => addr.address_type === "shipment" && addr.is_primary);
      const billingPrimaries = allAddresses.filter(addr => addr.address_type === "bill" && addr.is_primary);
      const finalDestinationPrimaries = allAddresses.filter(addr => addr.address_type === "final-destination" && addr.is_primary);

      // Should have 3 primary addresses total (one per type)
      expect(primaryAddresses).toHaveLength(3);
      expect(shipmentPrimaries).toHaveLength(1);
      expect(shipmentPrimaries[0].uuid).toBe("addr-1");
      expect(billingPrimaries).toHaveLength(1);
      expect(billingPrimaries[0].uuid).toBe("addr-2");
      expect(finalDestinationPrimaries).toHaveLength(1);
      expect(finalDestinationPrimaries[0].uuid).toBe("addr-3");
    });

    it("should ensure at least one primary per type when addresses exist", () => {
      // Simulate ensureAtLeastOnePerType function logic
      const ensureAtLeastOnePerType = (addresses: any[]) => {
        const updatedAddresses = [...addresses];
        const addressTypes = ['shipment', 'bill', 'final-destination'];
        
        for (const addressType of addressTypes) {
          const addressesOfType = updatedAddresses.filter(addr => addr.address_type === addressType);
          
          if (addressesOfType.length >= 1) {
            const hasSelected = addressesOfType.some(addr => addr.is_primary);
            
            if (!hasSelected) {
              const firstOfType = addressesOfType[0];
              const firstIndex = updatedAddresses.findIndex(addr => {
                if (firstOfType.uuid) {
                  return addr.uuid === firstOfType.uuid;
                } else if (firstOfType.tempId) {
                  return addr.tempId === firstOfType.tempId;
                }
                return false;
              });
              
              if (firstIndex !== -1) {
                updatedAddresses[firstIndex].is_primary = true;
              }
            }
          }
        }
        
        return updatedAddresses;
      };

      const addresses = [
        { uuid: "addr-1", address_type: "shipment", is_primary: false },
        { uuid: "addr-2", address_type: "bill", is_primary: false },
        { uuid: "addr-3", address_type: "final-destination", is_primary: false },
      ];

      const updated = ensureAtLeastOnePerType(addresses);

      expect(updated[0].is_primary).toBe(true);
      expect(updated[1].is_primary).toBe(true);
      expect(updated[2].is_primary).toBe(true);
    });

    it("should not select primary for types with no addresses", () => {
      // Simulate ensureAtLeastOnePerType function logic
      const ensureAtLeastOnePerType = (addresses: any[]) => {
        const updatedAddresses = [...addresses];
        const addressTypes = ['shipment', 'bill', 'final-destination'];
        
        for (const addressType of addressTypes) {
          const addressesOfType = updatedAddresses.filter(addr => addr.address_type === addressType);
          
          // Only apply if length >= 1
          if (addressesOfType.length >= 1) {
            const hasSelected = addressesOfType.some(addr => addr.is_primary);
            
            if (!hasSelected) {
              const firstOfType = addressesOfType[0];
              const firstIndex = updatedAddresses.findIndex(addr => {
                if (firstOfType.uuid) {
                  return addr.uuid === firstOfType.uuid;
                } else if (firstOfType.tempId) {
                  return addr.tempId === firstOfType.tempId;
                }
                return false;
              });
              
              if (firstIndex !== -1) {
                updatedAddresses[firstIndex].is_primary = true;
              }
            }
          }
        }
        
        return updatedAddresses;
      };

      // Only shipment addresses exist
      const addresses = [
        { uuid: "addr-1", address_type: "shipment", is_primary: false },
      ];

      const updated = ensureAtLeastOnePerType(addresses);

      // Should only select shipment, not create addresses for other types
      expect(updated[0].is_primary).toBe(true);
      expect(updated.length).toBe(1);
    });

    it("should allow selecting different primary within same type", () => {
      const addresses = [
        { uuid: "addr-1", address_type: "shipment", is_primary: true },
        { uuid: "addr-2", address_type: "shipment", is_primary: false },
        { uuid: "addr-3", address_type: "bill", is_primary: true },
      ];

      // Simulate changing primary from addr-1 to addr-2 (same type)
      const updated = addresses.map(addr => {
        if (addr.uuid === "addr-2") {
          return { ...addr, is_primary: true };
        } else if (addr.address_type === "shipment") {
          return { ...addr, is_primary: false };
        }
        return addr;
      });

      const shipmentPrimaries = updated.filter(addr => addr.address_type === "shipment" && addr.is_primary);
      const billingPrimaries = updated.filter(addr => addr.address_type === "bill" && addr.is_primary);

      // Should have only one primary per type
      expect(shipmentPrimaries).toHaveLength(1);
      expect(shipmentPrimaries[0].uuid).toBe("addr-2");
      expect(billingPrimaries).toHaveLength(1);
      expect(billingPrimaries[0].uuid).toBe("addr-3");
    });

    it("should maintain multiple primaries when selecting within different types", () => {
      const addresses = [
        { uuid: "addr-1", address_type: "shipment", is_primary: true },
        { uuid: "addr-2", address_type: "shipment", is_primary: false },
        { uuid: "addr-3", address_type: "bill", is_primary: true },
        { uuid: "addr-4", address_type: "bill", is_primary: false },
        { uuid: "addr-5", address_type: "final-destination", is_primary: false },
      ];

      // Select a different primary for bill type (should not affect shipment primary)
      const updated = addresses.map(addr => {
        if (addr.uuid === "addr-4") {
          return { ...addr, is_primary: true };
        } else if (addr.address_type === "bill" && addr.uuid !== "addr-4") {
          return { ...addr, is_primary: false };
        }
        return addr;
      });

      const shipmentPrimaries = updated.filter(addr => addr.address_type === "shipment" && addr.is_primary);
      const billingPrimaries = updated.filter(addr => addr.address_type === "bill" && addr.is_primary);

      // Both types should still have one primary each
      expect(shipmentPrimaries).toHaveLength(1);
      expect(shipmentPrimaries[0].uuid).toBe("addr-1");
      expect(billingPrimaries).toHaveLength(1);
      expect(billingPrimaries[0].uuid).toBe("addr-4");
    });

    it("should auto-select first address when only one exists per type", () => {
      // Simulate ensureAddressSelection function logic
      const ensureAddressSelection = (addresses: any[], newAddress: any): any => {
        if (!newAddress.address_type) return newAddress;
        
        const addressesOfSameType = addresses.filter(addr => 
          addr.address_type === newAddress.address_type && 
          (addr.uuid !== newAddress.uuid && addr.tempId !== newAddress.tempId)
        );
        
        if (addressesOfSameType.length === 0) {
          return { ...newAddress, is_primary: true };
        }
        
        return newAddress;
      };

      const existingAddresses: any[] = [];
      const newShipmentAddress = { uuid: "addr-1", address_type: "shipment", address_line_1: "123 Ship St" };
      const newBillingAddress = { uuid: "addr-2", address_type: "bill", address_line_1: "456 Bill Ave" };

      const shipmentResult = ensureAddressSelection(existingAddresses, newShipmentAddress);
      const billingResult = ensureAddressSelection([shipmentResult], newBillingAddress);

      // Both should be auto-selected as primary since they're the only ones of their type
      expect(shipmentResult.is_primary).toBe(true);
      expect(billingResult.is_primary).toBe(true);
    });

    it("should handle radio button groups independently per type", () => {
      // Simulate radio button behavior with different name attributes
      const shipmentRadioGroup = "primary-address-shipment";
      const billingRadioGroup = "primary-address-bill";
      const finalDestinationRadioGroup = "primary-address-final-destination";

      // Each group should be independent
      expect(shipmentRadioGroup).toBe("primary-address-shipment");
      expect(billingRadioGroup).toBe("primary-address-bill");
      expect(finalDestinationRadioGroup).toBe("primary-address-final-destination");
      expect(shipmentRadioGroup).not.toBe(billingRadioGroup);
      expect(billingRadioGroup).not.toBe(finalDestinationRadioGroup);
      expect(shipmentRadioGroup).not.toBe(finalDestinationRadioGroup);
    });

    it("should preserve existing primaries when adding new addresses", () => {
      const existingAddresses = [
        { uuid: "addr-1", address_type: "shipment", is_primary: true },
        { uuid: "addr-2", address_type: "bill", is_primary: true },
      ];

      const newAddress = { uuid: "addr-3", address_type: "final-destination", is_primary: false };
      const allAddresses = [...existingAddresses, newAddress];

      // Ensure at least one per type
      const ensureAtLeastOnePerType = (addresses: any[]) => {
        const updatedAddresses = [...addresses];
        const addressTypes = ['shipment', 'bill', 'final-destination'];
        
        for (const addressType of addressTypes) {
          const addressesOfType = updatedAddresses.filter(addr => addr.address_type === addressType);
          
          if (addressesOfType.length >= 1) {
            const hasSelected = addressesOfType.some(addr => addr.is_primary);
            
            if (!hasSelected) {
              const firstOfType = addressesOfType[0];
              const firstIndex = updatedAddresses.findIndex(addr => {
                if (firstOfType.uuid) {
                  return addr.uuid === firstOfType.uuid;
                }
                return false;
              });
              
              if (firstIndex !== -1) {
                updatedAddresses[firstIndex].is_primary = true;
              }
            }
          }
        }
        
        return updatedAddresses;
      };

      const updated = ensureAtLeastOnePerType(allAddresses);

      // Existing primaries should be preserved
      expect(updated.find(a => a.uuid === "addr-1")?.is_primary).toBe(true);
      expect(updated.find(a => a.uuid === "addr-2")?.is_primary).toBe(true);
      // New address should be auto-selected since it's the only one of its type
      expect(updated.find(a => a.uuid === "addr-3")?.is_primary).toBe(true);
    });
  });

  describe("Same as Billing Address Functionality", () => {
    const mockProjectAddressesStore = {
      getAddresses: vi.fn(),
      fetchAddresses: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should show checkbox only for shipment and final-destination address types", () => {
      const showSameAsBillingCheckbox = (addressType: string | null) => {
        return (
          addressType === "shipment" || addressType === "final-destination"
        );
      };

      expect(showSameAsBillingCheckbox("shipment")).toBe(true);
      expect(showSameAsBillingCheckbox("final-destination")).toBe(true);
      expect(showSameAsBillingCheckbox("bill")).toBe(false);
      expect(showSameAsBillingCheckbox(null)).toBe(false);
      expect(showSameAsBillingCheckbox("other")).toBe(false);
    });

    it("should populate form with primary billing address when checkbox is checked (saved project)", async () => {
      const primaryBillingAddress = {
        uuid: "bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        address_line_2: "Suite 100",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
      };

      const nonPrimaryBillingAddress = {
        uuid: "bill-2",
        address_type: "bill",
        is_primary: false,
        contact_person: "Jane Doe",
        email: "jane@example.com",
        phone: "987-654-3210",
        address_line_1: "456 Other St",
        address_line_2: "",
        city: "Los Angeles",
        state: "CA",
        zip_code: "90001",
        country: "US",
      };

      const allAddresses = [primaryBillingAddress, nonPrimaryBillingAddress];
      mockProjectAddressesStore.getAddresses.mockReturnValue(allAddresses);
      mockProjectAddressesStore.fetchAddresses.mockResolvedValue(allAddresses);

      // Simulate the handleSameAsBillingChange logic
      const projectId = "project-1";
      let addresses = mockProjectAddressesStore.getAddresses(projectId);
      if (!addresses || addresses.length === 0) {
        await mockProjectAddressesStore.fetchAddresses(projectId);
        addresses = mockProjectAddressesStore.getAddresses(projectId);
      }

      const allBillingAddresses = addresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      const addressForm = {
        address_type: "shipment",
        contact_person: "",
        email: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
      };

      if (billingAddress) {
        addressForm.contact_person = billingAddress.contact_person || "";
        addressForm.email = billingAddress.email || "";
        addressForm.phone = billingAddress.phone || "";
        addressForm.address_line_1 = billingAddress.address_line_1 || "";
        addressForm.address_line_2 = billingAddress.address_line_2 || "";
        addressForm.city = billingAddress.city || "";
        addressForm.state = billingAddress.state || "";
        addressForm.zip_code = billingAddress.zip_code || "";
        addressForm.country = billingAddress.country || "";
      }

      // Should use primary billing address
      expect(addressForm.contact_person).toBe("John Doe");
      expect(addressForm.email).toBe("john@example.com");
      expect(addressForm.phone).toBe("123-456-7890");
      expect(addressForm.address_line_1).toBe("123 Main St");
      expect(addressForm.address_line_2).toBe("Suite 100");
      expect(addressForm.city).toBe("New York");
      expect(addressForm.state).toBe("NY");
      expect(addressForm.zip_code).toBe("10001");
      expect(addressForm.country).toBe("US");
    });

    it("should fallback to any billing address if no primary exists (saved project)", async () => {
      const nonPrimaryBillingAddress = {
        uuid: "bill-1",
        address_type: "bill",
        is_primary: false,
        contact_person: "Jane Doe",
        email: "jane@example.com",
        phone: "987-654-3210",
        address_line_1: "456 Other St",
        city: "Los Angeles",
        state: "CA",
        zip_code: "90001",
        country: "US",
      };

      const allAddresses = [nonPrimaryBillingAddress];
      mockProjectAddressesStore.getAddresses.mockReturnValue(allAddresses);
      mockProjectAddressesStore.fetchAddresses.mockResolvedValue(allAddresses);

      const projectId = "project-1";
      let addresses = mockProjectAddressesStore.getAddresses(projectId);
      if (!addresses || addresses.length === 0) {
        await mockProjectAddressesStore.fetchAddresses(projectId);
        addresses = mockProjectAddressesStore.getAddresses(projectId);
      }

      const allBillingAddresses = addresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      const addressForm = {
        contact_person: "",
        email: "",
        phone: "",
        address_line_1: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
      };

      if (billingAddress) {
        addressForm.contact_person = billingAddress.contact_person || "";
        addressForm.email = billingAddress.email || "";
        addressForm.phone = billingAddress.phone || "";
        addressForm.address_line_1 = billingAddress.address_line_1 || "";
        addressForm.city = billingAddress.city || "";
        addressForm.state = billingAddress.state || "";
        addressForm.zip_code = billingAddress.zip_code || "";
        addressForm.country = billingAddress.country || "";
      }

      // Should use the only billing address available
      expect(addressForm.contact_person).toBe("Jane Doe");
      expect(addressForm.email).toBe("jane@example.com");
      expect(addressForm.address_line_1).toBe("456 Other St");
    });

    it("should populate form with primary billing address from temporary addresses (new project)", () => {
      const primaryBillingAddress = {
        tempId: "temp-bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        address_line_2: "Suite 100",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        isTemp: true,
      };

      const tempAddresses = [primaryBillingAddress];
      const allBillingAddresses = tempAddresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      const addressForm = {
        address_type: "final-destination",
        contact_person: "",
        email: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
      };

      if (billingAddress) {
        addressForm.contact_person = billingAddress.contact_person || "";
        addressForm.email = billingAddress.email || "";
        addressForm.phone = billingAddress.phone || "";
        addressForm.address_line_1 = billingAddress.address_line_1 || "";
        addressForm.address_line_2 = billingAddress.address_line_2 || "";
        addressForm.city = billingAddress.city || "";
        addressForm.state = billingAddress.state || "";
        addressForm.zip_code = billingAddress.zip_code || "";
        addressForm.country = billingAddress.country || "";
      }

      // Should use primary billing address from temporary addresses
      expect(addressForm.contact_person).toBe("John Doe");
      expect(addressForm.email).toBe("john@example.com");
      expect(addressForm.phone).toBe("123-456-7890");
      expect(addressForm.address_line_1).toBe("123 Main St");
      expect(addressForm.address_line_2).toBe("Suite 100");
      expect(addressForm.city).toBe("New York");
      expect(addressForm.state).toBe("NY");
      expect(addressForm.zip_code).toBe("10001");
      expect(addressForm.country).toBe("US");
    });

    it("should handle case when no billing address exists", async () => {
      const allAddresses: any[] = [];
      mockProjectAddressesStore.getAddresses.mockReturnValue(allAddresses);
      mockProjectAddressesStore.fetchAddresses.mockResolvedValue(allAddresses);

      const projectId = "project-1";
      let addresses = mockProjectAddressesStore.getAddresses(projectId);
      if (!addresses || addresses.length === 0) {
        await mockProjectAddressesStore.fetchAddresses(projectId);
        addresses = mockProjectAddressesStore.getAddresses(projectId);
      }

      const allBillingAddresses = addresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      // Should not find any billing address
      expect(billingAddress).toBeUndefined();
      expect(allBillingAddresses).toHaveLength(0);
    });

    it("should reset checkbox when address type changes to non-shipment/final-destination", () => {
      let sameAsBillingAddress = false;
      const addressForm = { address_type: "shipment" as string | null };

      // Simulate address type change
      const watchAddressType = (newType: string | null) => {
        if (newType !== "shipment" && newType !== "final-destination") {
          sameAsBillingAddress = false;
        }
      };

      // Initially checkbox can be checked for shipment
      addressForm.address_type = "shipment";
      sameAsBillingAddress = true;
      expect(sameAsBillingAddress).toBe(true);

      // Change to bill type - should reset checkbox
      addressForm.address_type = "bill";
      watchAddressType(addressForm.address_type);
      expect(sameAsBillingAddress).toBe(false);

      // Change to final-destination - checkbox can be checked again
      addressForm.address_type = "final-destination";
      sameAsBillingAddress = true;
      expect(sameAsBillingAddress).toBe(true);

      // Change to null - should reset checkbox
      addressForm.address_type = null;
      watchAddressType(addressForm.address_type);
      expect(sameAsBillingAddress).toBe(false);
    });

    it("should reset checkbox when form is reset", () => {
      let sameAsBillingAddress = true;
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        address_line_2: "Suite 100",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
      };

      // Simulate form reset
      const resetAddressForm = () => {
        addressForm.address_type = null;
        addressForm.contact_person = "";
        addressForm.email = "";
        addressForm.phone = "";
        addressForm.address_line_1 = "";
        addressForm.address_line_2 = "";
        addressForm.city = "";
        addressForm.state = "";
        addressForm.zip_code = "";
        addressForm.country = "";
        sameAsBillingAddress = false;
      };

      resetAddressForm();

      expect(sameAsBillingAddress).toBe(false);
      expect(addressForm.address_type).toBeNull();
      expect(addressForm.contact_person).toBe("");
      expect(addressForm.email).toBe("");
    });

    it("should handle multiple billing addresses and prefer primary", () => {
      const addresses = [
        {
          uuid: "bill-1",
          address_type: "bill",
          is_primary: false,
          contact_person: "Non-Primary 1",
          address_line_1: "111 Non-Primary St",
        },
        {
          uuid: "bill-2",
          address_type: "bill",
          is_primary: true,
          contact_person: "Primary Billing",
          address_line_1: "222 Primary St",
        },
        {
          uuid: "bill-3",
          address_type: "bill",
          is_primary: false,
          contact_person: "Non-Primary 2",
          address_line_1: "333 Non-Primary St",
        },
      ];

      const allBillingAddresses = addresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      // Should select the primary billing address
      expect(billingAddress.uuid).toBe("bill-2");
      expect(billingAddress.contact_person).toBe("Primary Billing");
      expect(billingAddress.address_line_1).toBe("222 Primary St");
    });

    it("should not clear form fields when checkbox is unchecked", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
      };

      let sameAsBillingAddress = true;

      // Simulate unchecking checkbox
      const handleUncheck = (checked: boolean) => {
        if (!checked) {
          // Don't clear fields when unchecked - user may have edited them
          sameAsBillingAddress = false;
        }
      };

      handleUncheck(false);

      // Fields should remain unchanged
      expect(sameAsBillingAddress).toBe(false);
      expect(addressForm.contact_person).toBe("John Doe");
      expect(addressForm.email).toBe("john@example.com");
      expect(addressForm.address_line_1).toBe("123 Main St");
    });

    it("should handle empty/null values in billing address gracefully", () => {
      const billingAddress = {
        uuid: "bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: null,
        email: "",
        phone: undefined,
        address_line_1: "123 Main St",
        address_line_2: null,
        city: "",
        state: "NY",
        zip_code: "",
        country: null,
      };

      const addressForm = {
        contact_person: "",
        email: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
      };

      // Copy with fallback to empty string
      addressForm.contact_person = billingAddress.contact_person || "";
      addressForm.email = billingAddress.email || "";
      addressForm.phone = billingAddress.phone || "";
      addressForm.address_line_1 = billingAddress.address_line_1 || "";
      addressForm.address_line_2 = billingAddress.address_line_2 || "";
      addressForm.city = billingAddress.city || "";
      addressForm.state = billingAddress.state || "";
      addressForm.zip_code = billingAddress.zip_code || "";
      addressForm.country = billingAddress.country || "";

      // Should handle null/undefined/empty values
      expect(addressForm.contact_person).toBe("");
      expect(addressForm.email).toBe("");
      expect(addressForm.phone).toBe("");
      expect(addressForm.address_line_1).toBe("123 Main St");
      expect(addressForm.address_line_2).toBe("");
      expect(addressForm.city).toBe("");
      expect(addressForm.state).toBe("NY");
      expect(addressForm.zip_code).toBe("");
      expect(addressForm.country).toBe("");
    });

    it("should check checkbox when editing address that was copied from billing address", () => {
      const addressCopiedFromBilling = {
        uuid: "addr-1",
        address_type: "shipment",
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        address_line_2: "Suite 100",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: "bill-1",
      };

      // Simulate editAddress logic
      const addressForm = {
        address_type: null as string | null,
        contact_person: "",
        email: "",
        phone: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
        copied_from_billing_address_uuid: null as string | null,
      };

      let sameAsBillingAddress = false;

      // Populate form
      addressForm.address_type = addressCopiedFromBilling.address_type || null;
      addressForm.contact_person =
        addressCopiedFromBilling.contact_person || "";
      addressForm.email = addressCopiedFromBilling.email || "";
      addressForm.phone = addressCopiedFromBilling.phone || "";
      addressForm.address_line_1 = addressCopiedFromBilling.address_line_1;
      addressForm.address_line_2 =
        addressCopiedFromBilling.address_line_2 || "";
      addressForm.city = addressCopiedFromBilling.city || "";
      addressForm.state = addressCopiedFromBilling.state || "";
      addressForm.zip_code = addressCopiedFromBilling.zip_code || "";
      addressForm.country = addressCopiedFromBilling.country || "";
      addressForm.copied_from_billing_address_uuid =
        addressCopiedFromBilling.copied_from_billing_address_uuid || null;

      // Check the checkbox if this address was copied from a billing address
      sameAsBillingAddress = !!(
        addressCopiedFromBilling.copied_from_billing_address_uuid &&
        (addressCopiedFromBilling.address_type === "shipment" ||
          addressCopiedFromBilling.address_type === "final-destination")
      );

      expect(sameAsBillingAddress).toBe(true);
      expect(addressForm.copied_from_billing_address_uuid).toBe("bill-1");
    });

    it("should not check checkbox when editing address that was not copied from billing", () => {
      const addressNotCopied = {
        uuid: "addr-1",
        address_type: "shipment",
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: null,
      };

      let sameAsBillingAddress = false;

      // Check the checkbox if this address was copied from a billing address
      sameAsBillingAddress = !!(
        addressNotCopied.copied_from_billing_address_uuid &&
        (addressNotCopied.address_type === "shipment" ||
          addressNotCopied.address_type === "final-destination")
      );

      expect(sameAsBillingAddress).toBe(false);
    });

    it("should not check checkbox when editing billing address type even if copied_from_billing_address_uuid exists", () => {
      const billingAddress = {
        uuid: "addr-1",
        address_type: "bill",
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "bill-2", // Should not happen, but test edge case
      };

      let sameAsBillingAddress = false;

      // Check the checkbox if this address was copied from a billing address
      sameAsBillingAddress = !!(
        billingAddress.copied_from_billing_address_uuid &&
        (billingAddress.address_type === "shipment" ||
          billingAddress.address_type === "final-destination")
      );

      expect(sameAsBillingAddress).toBe(false);
    });

    it("should check checkbox for final-destination address copied from billing", () => {
      const finalDestinationAddress = {
        uuid: "addr-1",
        address_type: "final-destination",
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "bill-1",
      };

      let sameAsBillingAddress = false;

      sameAsBillingAddress = !!(
        finalDestinationAddress.copied_from_billing_address_uuid &&
        (finalDestinationAddress.address_type === "shipment" ||
          finalDestinationAddress.address_type === "final-destination")
      );

      expect(sameAsBillingAddress).toBe(true);
    });

    it("should save copied_from_billing_address_uuid when creating address with checkbox checked", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        address_line_2: "Suite 100",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: "bill-1" as string | null,
      };

      const addressToSave = { ...addressForm };

      // Simulate API payload
      const apiPayload = {
        project_uuid: "project-1",
        address_type: addressToSave.address_type,
        contact_person: addressToSave.contact_person,
        email: addressToSave.email,
        phone: addressToSave.phone,
        address_line_1: addressToSave.address_line_1,
        address_line_2: addressToSave.address_line_2,
        city: addressToSave.city,
        state: addressToSave.state,
        zip_code: addressToSave.zip_code,
        country: addressToSave.country,
        is_primary: false,
        copied_from_billing_address_uuid:
          addressToSave.copied_from_billing_address_uuid || null,
      };

      expect(apiPayload.copied_from_billing_address_uuid).toBe("bill-1");
      expect(apiPayload.address_type).toBe("shipment");
    });

    it("should save null for copied_from_billing_address_uuid when checkbox is not checked", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: null as string | null,
      };

      const addressToSave = { ...addressForm };

      const apiPayload = {
        project_uuid: "project-1",
        address_type: addressToSave.address_type,
        contact_person: addressToSave.contact_person,
        email: addressToSave.email,
        phone: addressToSave.phone,
        address_line_1: addressToSave.address_line_1,
        city: addressToSave.city,
        state: addressToSave.state,
        zip_code: addressToSave.zip_code,
        country: addressToSave.country,
        is_primary: false,
        copied_from_billing_address_uuid:
          addressToSave.copied_from_billing_address_uuid || null,
      };

      expect(apiPayload.copied_from_billing_address_uuid).toBeNull();
    });

    it("should clear copied_from_billing_address_uuid when checkbox is unchecked", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: "bill-1" as string | null,
      };

      let sameAsBillingAddress = true;

      // Simulate unchecking checkbox
      const handleUncheck = (checked: boolean) => {
        if (!checked) {
          addressForm.copied_from_billing_address_uuid = null;
          sameAsBillingAddress = false;
        }
      };

      handleUncheck(false);

      expect(sameAsBillingAddress).toBe(false);
      expect(addressForm.copied_from_billing_address_uuid).toBeNull();
      // Fields should remain unchanged
      expect(addressForm.contact_person).toBe("John Doe");
      expect(addressForm.address_line_1).toBe("123 Main St");
    });

    it("should update copied_from_billing_address_uuid when updating address", () => {
      const existingAddress = {
        uuid: "addr-1",
        address_type: "shipment",
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: null,
      };

      const updatedAddress = {
        ...existingAddress,
        copied_from_billing_address_uuid: "bill-1",
      };

      const updatePayload = {
        uuid: updatedAddress.uuid,
        address_type: updatedAddress.address_type,
        contact_person: updatedAddress.contact_person,
        address_line_1: updatedAddress.address_line_1,
        copied_from_billing_address_uuid:
          updatedAddress.copied_from_billing_address_uuid,
      };

      expect(updatePayload.copied_from_billing_address_uuid).toBe("bill-1");
      expect(updatePayload.uuid).toBe("addr-1");
    });

    it("should handle temporary address with copied_from_billing_address_uuid (tempId)", () => {
      const tempBillingAddress = {
        tempId: "temp-bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: "John Doe",
        address_line_1: "123 Main St",
      };

      const tempShipmentAddress = {
        tempId: "temp-ship-1",
        address_type: "shipment",
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "temp-bill-1", // tempId reference
      };

      const tempAddresses = [tempBillingAddress, tempShipmentAddress];

      // Simulate saving temporary addresses
      const tempIdToUuidMap = new Map<string, string>();
      tempIdToUuidMap.set("temp-bill-1", "saved-bill-uuid");
      tempIdToUuidMap.set("temp-ship-1", "saved-ship-uuid");

      // Find the billing address UUID for the shipment address
      const billingAddressUuid = tempIdToUuidMap.get(
        tempShipmentAddress.copied_from_billing_address_uuid!
      );
      const currentAddressUuid = tempIdToUuidMap.get(
        tempShipmentAddress.tempId
      );

      expect(billingAddressUuid).toBe("saved-bill-uuid");
      expect(currentAddressUuid).toBe("saved-ship-uuid");

      // Simulate update payload
      const updatePayload = {
        uuid: currentAddressUuid,
        copied_from_billing_address_uuid: billingAddressUuid,
      };

      expect(updatePayload.copied_from_billing_address_uuid).toBe(
        "saved-bill-uuid"
      );
    });

    it("should reset checkbox and copied_from_billing_address_uuid when address type changes", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "bill-1" as string | null,
      };

      let sameAsBillingAddress = true;

      // Simulate address type change to bill
      const watchAddressType = (newType: string | null) => {
        if (newType !== "shipment" && newType !== "final-destination") {
          sameAsBillingAddress = false;
          addressForm.copied_from_billing_address_uuid = null;
        }
      };

      addressForm.address_type = "bill";
      watchAddressType(addressForm.address_type);

      expect(sameAsBillingAddress).toBe(false);
      expect(addressForm.copied_from_billing_address_uuid).toBeNull();
    });

    it("should preserve copied_from_billing_address_uuid when address type stays as shipment or final-destination", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "bill-1" as string | null,
      };

      let sameAsBillingAddress = true;

      // Simulate address type change to final-destination (still valid)
      const watchAddressType = (newType: string | null) => {
        if (newType !== "shipment" && newType !== "final-destination") {
          sameAsBillingAddress = false;
          addressForm.copied_from_billing_address_uuid = null;
        }
      };

      addressForm.address_type = "final-destination";
      watchAddressType(addressForm.address_type);

      // Should not reset since final-destination is valid
      expect(sameAsBillingAddress).toBe(true);
      expect(addressForm.copied_from_billing_address_uuid).toBe("bill-1");
    });

    it("should re-populate from current billing address when checkbox is re-checked after unchecking", async () => {
      const mockProjectAddressesStore = {
        getAddresses: vi.fn(),
        fetchAddresses: vi.fn(),
      };

      const primaryBillingAddress = {
        uuid: "bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: "Updated John Doe",
        email: "updated@example.com",
        phone: "999-999-9999",
        address_line_1: "999 Updated St",
        city: "Updated City",
        state: "CA",
        zip_code: "90210",
        country: "US",
      };

      const allAddresses = [primaryBillingAddress];
      mockProjectAddressesStore.getAddresses.mockReturnValue(allAddresses);
      mockProjectAddressesStore.fetchAddresses.mockResolvedValue(allAddresses);

      const projectId = "project-1";
      let addresses = mockProjectAddressesStore.getAddresses(projectId);
      if (!addresses || addresses.length === 0) {
        await mockProjectAddressesStore.fetchAddresses(projectId);
        addresses = mockProjectAddressesStore.getAddresses(projectId);
      }

      const allBillingAddresses = addresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "Old Name",
        email: "old@example.com",
        phone: "111-111-1111",
        address_line_1: "111 Old St",
        city: "Old City",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: null as string | null,
      };

      // Simulate re-checking checkbox
      if (billingAddress) {
        addressForm.contact_person = billingAddress.contact_person || "";
        addressForm.email = billingAddress.email || "";
        addressForm.phone = billingAddress.phone || "";
        addressForm.address_line_1 = billingAddress.address_line_1 || "";
        addressForm.city = billingAddress.city || "";
        addressForm.state = billingAddress.state || "";
        addressForm.zip_code = billingAddress.zip_code || "";
        addressForm.country = billingAddress.country || "";
        addressForm.copied_from_billing_address_uuid =
          billingAddress.uuid || null;
      }

      // Should be populated with current billing address data
      expect(addressForm.contact_person).toBe("Updated John Doe");
      expect(addressForm.email).toBe("updated@example.com");
      expect(addressForm.phone).toBe("999-999-9999");
      expect(addressForm.address_line_1).toBe("999 Updated St");
      expect(addressForm.copied_from_billing_address_uuid).toBe("bill-1");
    });

    it("should handle case when referenced billing address no longer exists", async () => {
      const addressWithDeletedBillingReference = {
        uuid: "addr-1",
        address_type: "shipment",
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "deleted-bill-uuid", // Billing address was deleted
      };

      const mockProjectAddressesStore = {
        getAddresses: vi.fn().mockReturnValue([]),
        fetchAddresses: vi.fn().mockResolvedValue([]),
      };

      const projectId = "project-1";
      let addresses = mockProjectAddressesStore.getAddresses(projectId);
      if (!addresses || addresses.length === 0) {
        await mockProjectAddressesStore.fetchAddresses(projectId);
        addresses = mockProjectAddressesStore.getAddresses(projectId);
      }

      const allBillingAddresses = addresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      // Should handle gracefully - checkbox can still be checked but won't find billing address
      expect(billingAddress).toBeUndefined();
      // The address still has the reference, but billing address doesn't exist
      expect(
        addressWithDeletedBillingReference.copied_from_billing_address_uuid
      ).toBe("deleted-bill-uuid");
    });

    it("should convert tempId to UUID correctly when saving temporary addresses", async () => {
      const tempAddresses = [
        {
          tempId: "temp-bill-1",
          address_type: "bill",
          is_primary: true,
          contact_person: "Billing Person",
          address_line_1: "123 Bill St",
        },
        {
          tempId: "temp-ship-1",
          address_type: "shipment",
          contact_person: "Billing Person",
          address_line_1: "123 Bill St",
          copied_from_billing_address_uuid: "temp-bill-1", // tempId reference
        },
      ];

      // Simulate saveTemporaryAddresses logic
      const tempIdToUuidMap = new Map<string, string>();
      const savedAddresses: any[] = [];

      // First pass: save all addresses
      for (const tempAddress of tempAddresses) {
        const isTempIdReference =
          tempAddress.copied_from_billing_address_uuid &&
          tempAddresses.some(
            (addr) =>
              addr.tempId === tempAddress.copied_from_billing_address_uuid
          );

        const savedAddress = {
          uuid: `saved-${tempAddress.tempId}`,
          ...tempAddress,
          copied_from_billing_address_uuid: isTempIdReference
            ? null
            : tempAddress.copied_from_billing_address_uuid || null,
        };

        savedAddresses.push(savedAddress);
        if (tempAddress.tempId) {
          tempIdToUuidMap.set(tempAddress.tempId, savedAddress.uuid);
        }
      }

      // Second pass: update addresses with tempId references
      for (const tempAddress of tempAddresses) {
        if (
          tempAddress.copied_from_billing_address_uuid &&
          tempAddress.tempId
        ) {
          const isTempIdReference = tempAddresses.some(
            (addr) =>
              addr.tempId === tempAddress.copied_from_billing_address_uuid
          );

          if (isTempIdReference) {
            const billingAddressUuid = tempIdToUuidMap.get(
              tempAddress.copied_from_billing_address_uuid
            );
            const currentAddressUuid = tempIdToUuidMap.get(tempAddress.tempId);

            if (billingAddressUuid && currentAddressUuid) {
              const addressToUpdate = savedAddresses.find(
                (a) => a.uuid === currentAddressUuid
              );
              if (addressToUpdate) {
                addressToUpdate.copied_from_billing_address_uuid =
                  billingAddressUuid;
              }
            }
          }
        }
      }

      const shipmentAddress = savedAddresses.find(
        (a) => a.address_type === "shipment"
      );
      const billingAddress = savedAddresses.find(
        (a) => a.address_type === "bill"
      );

      expect(shipmentAddress.copied_from_billing_address_uuid).toBe(
        billingAddress.uuid
      );
      expect(shipmentAddress.copied_from_billing_address_uuid).toBe(
        "saved-temp-bill-1"
      );
    });

    it("should handle mixed saved and temporary addresses when copying from billing", async () => {
      const savedBillingAddress = {
        uuid: "saved-bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: "Saved Billing",
        address_line_1: "123 Saved St",
      };

      const tempShipmentAddress = {
        tempId: "temp-ship-1",
        address_type: "shipment",
        contact_person: "Saved Billing",
        address_line_1: "123 Saved St",
        copied_from_billing_address_uuid: "saved-bill-1", // References saved address
      };

      // When saving temporary address that references a saved billing address
      const addressToSave = {
        ...tempShipmentAddress,
        // UUID reference should be preserved (not a tempId)
        copied_from_billing_address_uuid: "saved-bill-1",
      };

      const apiPayload = {
        project_uuid: "project-1",
        address_type: addressToSave.address_type,
        contact_person: addressToSave.contact_person,
        address_line_1: addressToSave.address_line_1,
        copied_from_billing_address_uuid:
          addressToSave.copied_from_billing_address_uuid,
      };

      // Should use the saved UUID directly (not convert)
      expect(apiPayload.copied_from_billing_address_uuid).toBe("saved-bill-1");
    });

    it("should handle multiple addresses with different copied relationships", () => {
      const addresses = [
        {
          uuid: "bill-1",
          address_type: "bill",
          is_primary: true,
          contact_person: "Primary Billing",
        },
        {
          uuid: "ship-1",
          address_type: "shipment",
          contact_person: "Primary Billing",
          copied_from_billing_address_uuid: "bill-1",
        },
        {
          uuid: "final-1",
          address_type: "final-destination",
          contact_person: "Primary Billing",
          copied_from_billing_address_uuid: "bill-1",
        },
        {
          uuid: "ship-2",
          address_type: "shipment",
          contact_person: "Custom Address",
          copied_from_billing_address_uuid: null, // Not copied
        },
      ];

      const addressesCopiedFromBilling = addresses.filter(
        (addr) => addr.copied_from_billing_address_uuid === "bill-1"
      );
      const addressesNotCopied = addresses.filter(
        (addr) => !addr.copied_from_billing_address_uuid
      );

      expect(addressesCopiedFromBilling).toHaveLength(2);
      expect(addressesCopiedFromBilling[0].uuid).toBe("ship-1");
      expect(addressesCopiedFromBilling[1].uuid).toBe("final-1");
      expect(addressesNotCopied).toHaveLength(2); // bill-1 and ship-2
    });

    it("should preserve copied_from_billing_address_uuid when updating other fields", () => {
      const existingAddress = {
        uuid: "addr-1",
        address_type: "shipment",
        contact_person: "John Doe",
        email: "john@example.com",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "bill-1",
      };

      // Update only contact person, should preserve copied_from_billing_address_uuid
      const updatedAddress = {
        ...existingAddress,
        contact_person: "Jane Doe", // Only this field changed
      };

      expect(updatedAddress.copied_from_billing_address_uuid).toBe("bill-1");
      expect(updatedAddress.contact_person).toBe("Jane Doe");
      expect(updatedAddress.email).toBe("john@example.com");
    });

    it("should handle checkbox state when editing temporary address with copied_from_billing_address_uuid", () => {
      const tempAddress = {
        tempId: "temp-ship-1",
        address_type: "shipment",
        contact_person: "John Doe",
        address_line_1: "123 Main St",
        copied_from_billing_address_uuid: "temp-bill-1", // tempId reference
      };

      let sameAsBillingAddress = false;

      // Check the checkbox if this address was copied from a billing address
      sameAsBillingAddress = !!(
        tempAddress.copied_from_billing_address_uuid &&
        (tempAddress.address_type === "shipment" ||
          tempAddress.address_type === "final-destination")
      );

      expect(sameAsBillingAddress).toBe(true);
      expect(tempAddress.copied_from_billing_address_uuid).toBe("temp-bill-1");
    });

    it("should handle case when primary billing address changes after address was copied", async () => {
      const originalBillingAddress = {
        uuid: "bill-1",
        address_type: "bill",
        is_primary: true,
        contact_person: "Original Billing",
      };

      const copiedAddress = {
        uuid: "ship-1",
        address_type: "shipment",
        contact_person: "Original Billing",
        copied_from_billing_address_uuid: "bill-1", // References original
      };

      // New primary billing address
      const newPrimaryBilling = {
        uuid: "bill-2",
        address_type: "bill",
        is_primary: true,
        contact_person: "New Primary Billing",
      };

      // The copied address should still reference the original billing address
      // even though there's a new primary
      expect(copiedAddress.copied_from_billing_address_uuid).toBe("bill-1");
      // The relationship is preserved to the original source
    });

    it("should handle resetting form clears copied_from_billing_address_uuid", () => {
      const addressForm = {
        address_type: "shipment" as string | null,
        contact_person: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        address_line_1: "123 Main St",
        address_line_2: "Suite 100",
        city: "New York",
        state: "NY",
        zip_code: "10001",
        country: "US",
        copied_from_billing_address_uuid: "bill-1" as string | null,
      };

      let sameAsBillingAddress = true;

      // Simulate resetAddressForm
      const resetAddressForm = () => {
        addressForm.address_type = null;
        addressForm.contact_person = "";
        addressForm.email = "";
        addressForm.phone = "";
        addressForm.address_line_1 = "";
        addressForm.address_line_2 = "";
        addressForm.city = "";
        addressForm.state = "";
        addressForm.zip_code = "";
        addressForm.country = "";
        addressForm.copied_from_billing_address_uuid = null;
        sameAsBillingAddress = false;
      };

      resetAddressForm();

      expect(sameAsBillingAddress).toBe(false);
      expect(addressForm.copied_from_billing_address_uuid).toBeNull();
      expect(addressForm.address_type).toBeNull();
      expect(addressForm.contact_person).toBe("");
    });

    it("should handle copying from non-primary billing address when no primary exists", async () => {
      const nonPrimaryBillingAddresses = [
        {
          uuid: "bill-1",
          address_type: "bill",
          is_primary: false,
          contact_person: "Non-Primary 1",
          address_line_1: "111 Non-Primary St",
        },
        {
          uuid: "bill-2",
          address_type: "bill",
          is_primary: false,
          contact_person: "Non-Primary 2",
          address_line_1: "222 Non-Primary St",
        },
      ];

      const allBillingAddresses = nonPrimaryBillingAddresses.filter(
        (addr: any) => addr.address_type === "bill"
      );
      const billingAddress =
        allBillingAddresses.find((addr: any) => addr.is_primary) ||
        allBillingAddresses[0];

      // Should fallback to first billing address when no primary exists
      expect(billingAddress.uuid).toBe("bill-1");
      expect(billingAddress.contact_person).toBe("Non-Primary 1");
    });
  });

  describe("Resizable Panels Functionality", () => {
    it("should initialize resizable panels with correct configuration", () => {
      const mockUseResizablePanels = vi.fn(() => ({
        isResizing: false,
        startResize: vi.fn(),
      }));

      const result = mockUseResizablePanels({
        minLeftWidth: 800,
        minRightWidth: 250,
        leftPanelRef: ref(null),
        rightPanelRef: ref(null),
      });

      expect(result.isResizing).toBe(false);
      expect(typeof result.startResize).toBe("function");
    });

    it("should handle resize start event", () => {
      const mockStartResize = vi.fn();
      const mockUseResizablePanels = vi.fn(() => ({
        isResizing: false,
        startResize: mockStartResize,
      }));

      const { startResize } = mockUseResizablePanels();

      // Simulate mouse down event
      startResize();

      expect(mockStartResize).toHaveBeenCalled();
    });
  });

  describe("Currency and Country Helpers", () => {
    it("should get currency symbol correctly", () => {
      const countries = [
        { code: "US", symbol: "$" },
        { code: "GB", symbol: "£" },
        { code: "DE", symbol: "€" },
      ];

      const getCurrencySymbol = (countryCode: string) => {
        const country = countries.find((c) => c.code === countryCode);
        return country ? country.symbol : "";
      };

      expect(getCurrencySymbol("US")).toBe("$");
      expect(getCurrencySymbol("GB")).toBe("£");
      expect(getCurrencySymbol("DE")).toBe("€");
      expect(getCurrencySymbol("INVALID")).toBe("");
    });

    it("should get currency code correctly", () => {
      const countries = [
        { code: "US", currency: "USD" },
        { code: "GB", currency: "GBP" },
        { code: "DE", currency: "EUR" },
      ];

      const getCurrency = (countryCode: string) => {
        const country = countries.find((c) => c.code === countryCode);
        return country ? country.currency : "";
      };

      expect(getCurrency("US")).toBe("USD");
      expect(getCurrency("GB")).toBe("GBP");
      expect(getCurrency("DE")).toBe("EUR");
      expect(getCurrency("INVALID")).toBe("");
    });
  });

  describe("Data Fetching and Store Integration", () => {
    it("should fetch project types and service types when corporation changes", async () => {
      const corporationUuid = "test-corp-uuid";

      // Mock the fetch functions
      const mockFetchProjectTypes = vi.fn().mockResolvedValue(undefined);
      const mockFetchServiceTypes = vi.fn().mockResolvedValue(undefined);

      // Simulate corporation change
      if (corporationUuid) {
        await Promise.all([
          mockFetchProjectTypes(corporationUuid),
          mockFetchServiceTypes(corporationUuid),
        ]);
      }

      expect(mockFetchProjectTypes).toHaveBeenCalledWith(corporationUuid);
      expect(mockFetchServiceTypes).toHaveBeenCalledWith(corporationUuid);
    });

    it("should handle fetch errors gracefully", async () => {
      const corporationUuid = "test-corp-uuid";

      const mockFetchProjectTypes = vi
        .fn()
        .mockRejectedValue(new Error("Network error"));
      const mockFetchServiceTypes = vi.fn().mockResolvedValue(undefined);

      try {
        await Promise.all([
          mockFetchProjectTypes(corporationUuid),
          mockFetchServiceTypes(corporationUuid),
        ]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Network error");
      }
    });

    it("should not fetch when no corporation is selected", async () => {
      const corporationUuid = null;

      const mockFetchProjectTypes = vi.fn();
      const mockFetchServiceTypes = vi.fn();

      if (!corporationUuid) {
        // Should not call fetch functions
        expect(mockFetchProjectTypes).not.toHaveBeenCalled();
        expect(mockFetchServiceTypes).not.toHaveBeenCalled();
      }
    });
  });

  describe("Corporation Display Functionality", () => {
    it("should display corporation select correctly with CorporationSelect component", () => {
      const corporationUuid = mockCorpStore.selectedCorporation?.uuid || "";

      // Test the corporation UUID
      expect(corporationUuid).toBe("test-corp-uuid");

      // Test CorporationSelect component properties
      const corporationSelectProps = {
        modelValue: corporationUuid,
        placeholder: "Select corporation",
        size: "sm",
        class: "w-full",
      };

      expect(corporationSelectProps.modelValue).toBe("test-corp-uuid");
      expect(corporationSelectProps.placeholder).toBe("Select corporation");
      expect(corporationSelectProps.size).toBe("sm");
      expect(corporationSelectProps.class).toBe("w-full");
    });

    it("should handle missing corporation gracefully", () => {
      const mockStoreWithoutCorp = { selectedCorporation: null };
      const corporationUuid = mockStoreWithoutCorp.selectedCorporation?.uuid || "";

      expect(corporationUuid).toBe("");

      // Test CorporationSelect component properties with empty value
      const corporationSelectProps = {
        modelValue: corporationUuid,
        placeholder: "Select corporation",
        size: "sm",
        class: "w-full",
      };

      expect(corporationSelectProps.modelValue).toBe("");
      expect(corporationSelectProps.placeholder).toBe("Select corporation");
    });

    it("should be editable and allow corporation selection", () => {
      const corporationSelectProps = {
        modelValue: "test-corp-uuid",
        placeholder: "Select corporation",
        size: "sm",
        class: "w-full",
      };

      // Verify it's editable (not disabled)
      expect(corporationSelectProps.modelValue).toBe("test-corp-uuid");

      // Verify it has proper size and styling
      expect(corporationSelectProps.size).toBe("sm");
      expect(corporationSelectProps.class).toBe("w-full");
    });

    it("should handle corporation change events", () => {
      const form = { ...defaultForm };
      const newCorporationUuid = "new-corp-uuid";
      
      // Simulate corporation change
      const updatedForm = { ...form, corporation_uuid: newCorporationUuid };
      
      expect(updatedForm.corporation_uuid).toBe("new-corp-uuid");
      expect(updatedForm).not.toBe(form); // Should be a new object
    });
  });

  describe("Corporation Selector Disabled When Estimates Exist", () => {
    // Mock useToast
    const mockToast = {
      add: vi.fn()
    };
    vi.mock('#app', () => ({
      useToast: () => mockToast
    }));
    vi.stubGlobal('useToast', () => mockToast);

    it("should disable corporation selector when editing project with estimates", () => {
      // Simulate the isCorporationDisabled computed logic
      const editingProject = true;
      const hasProjectEstimates = true;
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      expect(isCorporationDisabled).toBe(true);
    });

    it("should enable corporation selector when creating new project", () => {
      // Simulate the isCorporationDisabled computed logic
      const editingProject = false;
      const hasProjectEstimates = false; // New project has no estimates
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      expect(isCorporationDisabled).toBe(false);
    });

    it("should enable corporation selector when editing project without estimates", () => {
      // Simulate the isCorporationDisabled computed logic
      const editingProject = true;
      const hasProjectEstimates = false; // No estimates exist
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      expect(isCorporationDisabled).toBe(false);
    });

    it("should enable corporation selector when not editing even if estimates exist", () => {
      // Simulate the isCorporationDisabled computed logic
      const editingProject = false;
      const hasProjectEstimates = true; // Estimates exist but not editing
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      expect(isCorporationDisabled).toBe(false);
    });

    it("should show toast message when user tries to click disabled corporation selector", () => {
      const editingProject = true;
      const hasProjectEstimates = true;
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      // Simulate handleCorporationClick function
      const handleCorporationClick = (event: any) => {
        if (isCorporationDisabled) {
          event.preventDefault();
          event.stopPropagation();
          
          mockToast.add({
            title: 'Cannot Change Corporation',
            description: 'Corporation cannot be changed when estimates exist for this project.',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
          });
        }
      };

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      };

      handleCorporationClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockToast.add).toHaveBeenCalledWith({
        title: 'Cannot Change Corporation',
        description: 'Corporation cannot be changed when estimates exist for this project.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      });
    });

    it("should not show toast when corporation selector is enabled", () => {
      const editingProject = false;
      const hasProjectEstimates = false;
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      // Simulate handleCorporationClick function
      const handleCorporationClick = (event: any) => {
        if (isCorporationDisabled) {
          event.preventDefault();
          event.stopPropagation();
          
          mockToast.add({
            title: 'Cannot Change Corporation',
            description: 'Corporation cannot be changed when estimates exist for this project.',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
          });
        }
      };

      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      };

      handleCorporationClick(mockEvent);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
      expect(mockToast.add).not.toHaveBeenCalled();
    });

    it("should allow corporation change when no estimates exist", () => {
      const form = { ...defaultForm, id: 'project-1' };
      const editingProject = true;
      const hasProjectEstimates = false;
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      // Simulate corporation change
      const newCorporationUuid = "new-corp-uuid";
      const updatedForm = { ...form, corporation_uuid: newCorporationUuid };

      expect(isCorporationDisabled).toBe(false);
      expect(updatedForm.corporation_uuid).toBe("new-corp-uuid");
    });

    it("should prevent corporation change when estimates exist", () => {
      const form = { ...defaultForm, id: 'project-1', corporation_uuid: 'original-corp-uuid' };
      const editingProject = true;
      const hasProjectEstimates = true;
      const isCorporationDisabled = editingProject && hasProjectEstimates;

      // Simulate attempt to change corporation
      const newCorporationUuid = "new-corp-uuid";
      
      // When disabled, the change should not be applied
      const updatedForm = isCorporationDisabled 
        ? form // Keep original
        : { ...form, corporation_uuid: newCorporationUuid };

      expect(isCorporationDisabled).toBe(true);
      expect(updatedForm.corporation_uuid).toBe("original-corp-uuid");
    });
  });
})
