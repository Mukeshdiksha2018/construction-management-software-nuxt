import { ref, computed, onUnmounted } from 'vue'

export interface FilePreviewOptions {
  allowedTypes?: string[]
  maxSize?: number // in bytes
}

export function useFilePreview(options: FilePreviewOptions = {}) {
  const {
    allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
    maxSize = 10 * 1024 * 1024, // 10MB default
  } = options;

  const uploadedFile = ref<File | null>(null);
  const blobUrls = ref<string[]>([]);
  const fileUploadError = ref<string | null>(null);

  // Computed properties
  const currentPreviewFile = computed(() => {
    if (!uploadedFile.value) return null;
    return uploadedFile.value;
  });

  const fileUploadErrorMessage = computed(() => {
    return fileUploadError.value;
  });

  // File type checking
  const isPdfFile = (type: string) => {
    return type?.includes("pdf");
  };

  const isImageFile = (type: string) => {
    return type?.includes("image");
  };

  const getFileIcon = (type: string) => {
    if (type?.includes("pdf")) return "i-heroicons-document-text";
    if (type?.includes("image")) return "i-heroicons-photo";
    return "i-heroicons-document";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // File validation
  const validateFile = (file: File | null): string | null => {
    if (!file) return null;

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Only ${allowedTypes
        .map((type) => type.split("/")[1].toUpperCase())
        .join(", ")} files are allowed.`;
    }

    // Validate file size
    if (file.size > maxSize) {
      return `File size too large. Maximum size is ${formatFileSize(maxSize)}.`;
    }

    return null;
  };

  // Test URL accessibility
  const testUrlAccessibility = async (url: string) => {
    try {
      const response = await fetch(url, { method: "HEAD" });
      console.log(
        `URL accessibility test for ${url}:`,
        response.status,
        response.statusText
      );
      return response.ok;
    } catch (error) {
      console.error(`URL accessibility test failed for ${url}:`, error);
      return false;
    }
  };

  // File preview URL generation
  const getFilePreviewUrl = (file: any) => {
    // Handle both uploaded files (with file_url) and temporary files (with url/base64)
    let url = file.file_url || file.url || "";

    console.log("getFilePreviewUrl called with file:", file);
    console.log("Generated URL:", url);

    // If no URL is available, return empty string
    if (!url) {
      console.warn("No file URL available for preview:", file);
      return "";
    }

    // If it's a base64 data URL, convert it to a blob URL for better iframe compatibility
    if (url.startsWith("data:")) {
      try {
        // Convert base64 to blob
        const base64Data = url.split(",")[1];
        if (!base64Data) {
          console.error("Invalid base64 data URL");
          return "";
        }

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], {
          type: file.file_type || file.type || "application/pdf",
        });
        url = URL.createObjectURL(blob);
        blobUrls.value.push(url); // Track for cleanup
        console.log("Converted base64 to blob URL:", url);
      } catch (error) {
        console.error("Error converting base64 to blob:", error);
        return "";
      }
    } else {
      // For external URLs (like Supabase), test accessibility
      console.log("Using external URL:", url);
      testUrlAccessibility(url);
    }

    return url;
  };

  // File download
  const downloadFile = (file: any) => {
    if (file.file_url || file.url) {
      const link = document.createElement("a");
      link.href = file.file_url || file.url;
      link.download = file.file_name || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // File upload handling
  const handleFileUpload = (file: File | null) => {
    // Clear any previous errors
    fileUploadError.value = null;

    if (!file) {
      uploadedFile.value = null;
      return;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      fileUploadError.value = validationError;
      uploadedFile.value = null;
      return;
    }

    // Clear error and set file
    fileUploadError.value = null;
    uploadedFile.value = file;
  };

  // Event handlers
  const onIframeLoad = (event: any) => {
    console.log("iframe loaded successfully:", event);
  };

  const onIframeError = (event: any) => {
    console.error("iframe load error:", event);
    console.error(
      "This usually means the file URL is not accessible or the file does not exist"
    );
  };

  // Cleanup blob URLs on unmount
  onUnmounted(() => {
    blobUrls.value.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    blobUrls.value = [];
  });

  return {
    // State
    uploadedFile,
    fileUploadError,

    // Computed
    currentPreviewFile,
    fileUploadErrorMessage,

    // Methods
    isPdfFile,
    isImageFile,
    getFileIcon,
    formatFileSize,
    validateFile,
    getFilePreviewUrl,
    testUrlAccessibility,
    downloadFile,
    handleFileUpload,
    onIframeLoad,
    onIframeError,
  };
}
