import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFilePreview } from '@/composables/useFilePreview'

// Mock DOM APIs
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  },
  writable: true
})

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()

Object.defineProperty(URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true
})

Object.defineProperty(URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true
})

// Mock atob for base64 decoding
const mockAtob = vi.fn()
Object.defineProperty(global, 'atob', {
  value: mockAtob,
  writable: true
})

// Mock fetch for URL accessibility testing
global.fetch = vi.fn()

describe('useFilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateObjectURL.mockReturnValue('blob:mock-url')
    mockAtob.mockReturnValue('mock-decoded-data')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('File type checking', () => {
    it('should identify PDF files correctly', () => {
      const { isPdfFile } = useFilePreview()
      
      expect(isPdfFile('application/pdf')).toBe(true)
      expect(isPdfFile('application/pdf; charset=utf-8')).toBe(true)
      expect(isPdfFile('image/jpeg')).toBe(false)
      expect(isPdfFile('')).toBe(false)
      expect(isPdfFile(undefined as any)).toBeFalsy()
    })

    it('should identify image files correctly', () => {
      const { isImageFile } = useFilePreview()
      
      expect(isImageFile('image/jpeg')).toBe(true)
      expect(isImageFile('image/png')).toBe(true)
      expect(isImageFile('image/gif')).toBe(true)
      expect(isImageFile('application/pdf')).toBe(false)
      expect(isImageFile('')).toBe(false)
      expect(isImageFile(undefined as any)).toBeFalsy()
    })
  })

  describe('File icon generation', () => {
    it('should return correct icons for different file types', () => {
      const { getFileIcon } = useFilePreview()
      
      expect(getFileIcon('application/pdf')).toBe('i-heroicons-document-text')
      expect(getFileIcon('image/jpeg')).toBe('i-heroicons-photo')
      expect(getFileIcon('image/png')).toBe('i-heroicons-photo')
      expect(getFileIcon('text/plain')).toBe('i-heroicons-document')
      expect(getFileIcon('')).toBe('i-heroicons-document')
      expect(getFileIcon(undefined as any)).toBe('i-heroicons-document')
    })
  })

  describe('File size formatting', () => {
    it('should format file sizes correctly', () => {
      const { formatFileSize } = useFilePreview()
      
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1536 * 1024)).toBe('1.5 MB')
    })
  })

  describe('File validation', () => {
    it('should validate file types correctly', () => {
      const { validateFile } = useFilePreview({
        allowedTypes: ['application/pdf', 'image/jpeg']
      })
      
      const validPdfFile = new File([''], 'test.pdf', { type: 'application/pdf' })
      const validImageFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' })
      
      expect(validateFile(validPdfFile)).toBeNull()
      expect(validateFile(validImageFile)).toBeNull()
      expect(validateFile(invalidFile)).toContain('Invalid file type')
      expect(validateFile(null)).toBeNull()
    })

    it('should validate file sizes correctly', () => {
      const { validateFile } = useFilePreview({
        maxSize: 1024 * 1024 // 1MB
      })
      
      const smallFile = new File([''], 'small.pdf', { type: 'application/pdf' })
      Object.defineProperty(smallFile, 'size', { value: 512 * 1024 }) // 512KB
      
      const largeFile = new File([''], 'large.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', { value: 2 * 1024 * 1024 }) // 2MB
      
      expect(validateFile(smallFile)).toBeNull()
      expect(validateFile(largeFile)).toContain('File size too large')
    })
  })

  describe('URL accessibility testing', () => {
    it('should test URL accessibility successfully', async () => {
      const { testUrlAccessibility } = useFilePreview()
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      })
      
      const result = await testUrlAccessibility('https://example.com/file.pdf')
      
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/file.pdf', { method: 'HEAD' })
    })

    it('should handle URL accessibility test failures', async () => {
      const { testUrlAccessibility } = useFilePreview()
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })
      
      const result = await testUrlAccessibility('https://example.com/missing.pdf')
      
      expect(result).toBe(false)
    })

    it('should handle network errors in URL accessibility test', async () => {
      const { testUrlAccessibility } = useFilePreview()
      
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
      
      const result = await testUrlAccessibility('https://example.com/file.pdf')
      
      expect(result).toBe(false)
    })
  })

  describe('File preview URL generation', () => {
    it('should return empty string for files without URL', () => {
      const { getFilePreviewUrl } = useFilePreview()
      
      const fileWithoutUrl = { name: 'test.pdf' }
      const result = getFilePreviewUrl(fileWithoutUrl)
      
      expect(result).toBe('')
    })

    it('should handle base64 data URLs correctly', () => {
      const { getFilePreviewUrl } = useFilePreview()
      
      const base64File = {
        name: 'test.pdf',
        type: 'application/pdf',
        url: 'data:application/pdf;base64,JVBERi0xLjQK'
      }
      
      // Mock the base64 decoding
      const mockByteArray = new Uint8Array([1, 2, 3, 4])
      mockAtob.mockReturnValue('mock-decoded-data')
      
      const result = getFilePreviewUrl(base64File)
      
      expect(result).toBe('blob:mock-url')
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockAtob).toHaveBeenCalledWith('JVBERi0xLjQK')
    })

    it('should handle external URLs correctly', () => {
      const { getFilePreviewUrl } = useFilePreview()
      
      const externalFile = {
        name: 'test.pdf',
        file_url: 'https://example.com/file.pdf'
      }
      
      const result = getFilePreviewUrl(externalFile)
      
      expect(result).toBe('https://example.com/file.pdf')
    })

    it('should handle invalid base64 data URLs', () => {
      const { getFilePreviewUrl } = useFilePreview()
      
      const invalidBase64File = {
        name: 'test.pdf',
        url: 'data:application/pdf;base64,'
      }
      
      const result = getFilePreviewUrl(invalidBase64File)
      
      expect(result).toBe('')
    })

    it('should handle base64 conversion errors', () => {
      const { getFilePreviewUrl } = useFilePreview()
      
      const base64File = {
        name: 'test.pdf',
        url: 'data:application/pdf;base64,invalid-base64'
      }
      
      mockAtob.mockImplementation(() => {
        throw new Error('Invalid base64')
      })
      
      const result = getFilePreviewUrl(base64File)
      
      expect(result).toBe('')
    })
  })

  describe('File download', () => {
    it('should create download link for files with URL', () => {
      const { downloadFile } = useFilePreview()
      
      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      }
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)
      
      const file = {
        name: 'test.pdf',
        file_url: 'https://example.com/file.pdf'
      }
      
      downloadFile(file)
      
      expect(mockLink.href).toBe('https://example.com/file.pdf')
      expect(mockLink.download).toBe('test.pdf')
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
      expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
    })

    it('should not create download link for files without URL', () => {
      const { downloadFile } = useFilePreview()
      
      const mockCreateElement = vi.spyOn(document, 'createElement')
      
      const file = {
        name: 'test.pdf'
      }
      
      downloadFile(file)
      
      expect(mockCreateElement).not.toHaveBeenCalled()
    })
  })

  describe('File upload handling', () => {
    it('should handle valid file uploads', () => {
      const { handleFileUpload, uploadedFile, fileUploadError } = useFilePreview()
      
      const validFile = new File([''], 'test.pdf', { type: 'application/pdf' })
      Object.defineProperty(validFile, 'size', { value: 1024 })
      
      handleFileUpload(validFile)
      
      expect(uploadedFile.value).toStrictEqual(validFile)
      expect(fileUploadError.value).toBeNull()
    })

    it('should handle null file uploads', () => {
      const { handleFileUpload, uploadedFile } = useFilePreview()
      
      handleFileUpload(null)
      
      expect(uploadedFile.value).toBeNull()
    })

    it('should handle invalid file types', () => {
      const { handleFileUpload, uploadedFile, fileUploadError } = useFilePreview({
        allowedTypes: ['application/pdf']
      })
      
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' })
      
      handleFileUpload(invalidFile)
      
      expect(uploadedFile.value).toBeNull()
      expect(fileUploadError.value).toContain('Invalid file type')
    })

    it('should handle oversized files', () => {
      const { handleFileUpload, uploadedFile, fileUploadError } = useFilePreview({
        maxSize: 1024
      })
      
      const largeFile = new File([''], 'large.pdf', { type: 'application/pdf' })
      Object.defineProperty(largeFile, 'size', { value: 2048 })
      
      handleFileUpload(largeFile)
      
      expect(uploadedFile.value).toBeNull()
      expect(fileUploadError.value).toContain('File size too large')
    })
  })

  describe('Event handlers', () => {
    it('should handle iframe load events', () => {
      const { onIframeLoad } = useFilePreview()
      
      const mockEvent = { target: { src: 'test-url' } }
      
      // Should not throw
      expect(() => onIframeLoad(mockEvent)).not.toThrow()
    })

    it('should handle iframe error events', () => {
      const { onIframeError } = useFilePreview()
      
      const mockEvent = { target: { src: 'test-url' } }
      
      // Should not throw
      expect(() => onIframeError(mockEvent)).not.toThrow()
    })
  })

  describe('Blob URL cleanup', () => {
    it('should track blob URLs for cleanup', () => {
      const { getFilePreviewUrl } = useFilePreview()
      
      const base64File = {
        name: 'test.pdf',
        url: 'data:application/pdf;base64,JVBERi0xLjQK'
      }
      
      mockAtob.mockReturnValue('mock-decoded-data')
      
      getFilePreviewUrl(base64File)
      
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })
  })
})
