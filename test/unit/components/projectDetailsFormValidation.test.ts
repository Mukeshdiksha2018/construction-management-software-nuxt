import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Vue and Nuxt composables
vi.mock('vue', () => ({
  ref: (value: any) => ({ value }),
  computed: (fn: () => any) => ({ value: fn() }),
  watch: vi.fn(),
  nextTick: vi.fn().mockResolvedValue(undefined),
  onUnmounted: vi.fn(),
}))

vi.mock('#app', () => ({
  $fetch: vi.fn(),
}))

// Mock stores
const mockCorporationStore = {
  selectedCorporation: {
    uuid: 'corp-1',
    corporation_name: 'Test Corp'
  }
}

vi.mock('@/stores/corporations', () => ({
  useCorporationStore: () => mockCorporationStore
}))

// Mock composables
vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
    currencySymbol: '$'
  })
}))

describe('Project Details Form Validation', () => {
  describe('Form Data Validation', () => {
    it('should validate required fields', () => {
      const formData = {
        corporation_uuid: '',
        project_name: '',
        project_id: '',
        project_type: '',
        service_type: '',
        project_start_date: '',
        project_estimated_completion_date: ''
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).toContain('Corporation is required')
      expect(errors).toContain('Project Name is required')
      expect(errors).toContain('Project ID is required')
      expect(errors).toContain('Project Type is required')
      expect(errors).toContain('Service Type is required')
      expect(errors).toContain('Project Start Date is required')
      expect(errors).toContain('Project Estimated Completion Date is required')
    })

    it('should pass validation with valid data', () => {
      // Use future dates to avoid date validation issues
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureCompletionDate = new Date()
      futureCompletionDate.setDate(futureCompletionDate.getDate() + 90)
      
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: futureDate.toISOString().split('T')[0],
        project_estimated_completion_date: futureCompletionDate.toISOString().split('T')[0],
        estimated_amount: '50000',
        area_sq_ft: '1000',
        contingency_percentage: '10'
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).toHaveLength(0)
    })

    it('should validate area OR number of rooms requirement', () => {
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: '2024-01-01',
        project_estimated_completion_date: '2024-06-01',
        area_sq_ft: '',
        no_of_rooms: ''
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).toContain('Either Area (Sq ft) or Number of Rooms is required')
    })

    it('should pass when area is provided', () => {
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: '2024-01-01',
        project_estimated_completion_date: '2024-06-01',
        area_sq_ft: '1000',
        no_of_rooms: ''
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).not.toContain('Either Area (Sq ft) or Number of Rooms is required')
    })

    it('should pass when number of rooms is provided', () => {
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: '2024-01-01',
        project_estimated_completion_date: '2024-06-01',
        area_sq_ft: '',
        no_of_rooms: '5'
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).not.toContain('Either Area (Sq ft) or Number of Rooms is required')
    })

    it('should validate future dates for completion', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 30)
      
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: '2024-01-01',
        project_estimated_completion_date: pastDate.toISOString().split('T')[0],
        area_sq_ft: '1000'
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).toContain('Completion date cannot be in the past')
    })

    it('should validate completion date is after start date', () => {
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: '2024-06-01',
        project_estimated_completion_date: '2024-01-01',
        area_sq_ft: '1000'
      }

      const errors = validateProjectDetailsForm(formData)

      expect(errors).toContain('Completion date must be after start date')
    })
  })

  describe('File Upload Validation', () => {
    it('should validate multiple file types', () => {
      const validFiles = [
        { name: 'doc.pdf', type: 'application/pdf' },
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'pic.png', type: 'image/png' }
      ]

      validFiles.forEach(file => {
        const error = validateFileUpload(file)
        expect(error).toBe(null)
      })
    })

    it('should reject invalid file types', () => {
      const invalidFiles = [
        { name: 'doc.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        { name: 'script.exe', type: 'application/exe' },
        { name: 'video.mp4', type: 'video/mp4' }
      ]

      invalidFiles.forEach(file => {
        const error = validateFileUpload(file)
        expect(error).toContain('Invalid file type')
      })
    })

    it('should validate file size limits', () => {
      const largeFile = { 
        name: 'large.pdf', 
        type: 'application/pdf', 
        size: 11 * 1024 * 1024 // 11MB
      }

      const error = validateFileUpload(largeFile)
      expect(error).toContain('File size too large')
    })

    it('should accept files within size limit', () => {
      const validFile = { 
        name: 'small.pdf', 
        type: 'application/pdf', 
        size: 5 * 1024 * 1024 // 5MB
      }

      const error = validateFileUpload(validFile)
      expect(error).toBe(null)
    })

    it('should validate multiple files', () => {
      const files = [
        { name: 'doc1.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 },
        { name: 'doc2.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 },
        { name: 'doc3.png', type: 'image/png', size: 2 * 1024 * 1024 }
      ]

      const errors = validateMultipleFiles(files)
      expect(errors).toHaveLength(0)
    })

    it('should detect invalid files in multiple file upload', () => {
      const files = [
        { name: 'doc1.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 },
        { name: 'doc2.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1 * 1024 * 1024 },
        { name: 'doc3.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 }
      ]

      const errors = validateMultipleFiles(files)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('doc2.docx')
    })
  })

  describe('Form State Management', () => {
    let formState: any

    beforeEach(() => {
      // Use future dates to avoid validation issues
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureCompletionDate = new Date()
      futureCompletionDate.setDate(futureCompletionDate.getDate() + 90)
      
      formState = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: futureDate.toISOString().split('T')[0],
        project_estimated_completion_date: futureCompletionDate.toISOString().split('T')[0],
        estimated_amount: '50000',
        area_sq_ft: '1000',
        contingency_percentage: '10',
        attachments: [],
        only_total: false,
        enable_labor: false,
        enable_material: false
      }
    })

    it('should validate complete form submission', () => {
      const validation = validateCompleteProjectForm(formState)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.canSubmit).toBe(true)
    })

    it('should prevent submission with validation errors', () => {
      formState.project_name = '' // Missing required field
      formState.area_sq_ft = '' // Missing area
      formState.no_of_rooms = '' // Missing rooms

      const validation = validateCompleteProjectForm(formState)

      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.canSubmit).toBe(false)
    })

    it('should handle checkbox states correctly', () => {
      formState.only_total = true
      formState.enable_labor = true
      formState.enable_material = true

      const validation = validateCompleteProjectForm(formState)

      expect(validation.isValid).toBe(true)
      expect(formState.only_total).toBe(true)
      expect(formState.enable_labor).toBe(true)
      expect(formState.enable_material).toBe(true)
    })
  })

  describe('Reactive Form Updates', () => {
    it('should validate in real-time as user types', () => {
      // Use future dates to avoid validation issues
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureCompletionDate = new Date()
      futureCompletionDate.setDate(futureCompletionDate.getDate() + 90)
      
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: '', // User typing project name
        project_id: '',
        project_type: '',
        service_type: '',
        project_start_date: futureDate.toISOString().split('T')[0],
        project_estimated_completion_date: futureCompletionDate.toISOString().split('T')[0],
        area_sq_ft: ''
      }

      // Initially invalid (empty project name)
      let validation = validateCompleteProjectForm(formData)
      expect(validation.isValid).toBe(false)

      // User enters project name
      formData.project_name = 'Test Project'
      formData.project_id = 'PROJ-001'
      formData.project_type = 'construction'
      formData.service_type = 'electrical'
      formData.area_sq_ft = '1000'

      validation = validateCompleteProjectForm(formData)
      expect(validation.isValid).toBe(true)
    })

    it('should handle area/rooms toggle correctly', () => {
      // Use future dates to avoid validation issues
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const futureCompletionDate = new Date()
      futureCompletionDate.setDate(futureCompletionDate.getDate() + 90)
      
      const formData = {
        corporation_uuid: 'corp-1',
        project_name: 'Test Project',
        project_id: 'PROJ-001',
        project_type: 'construction',
        service_type: 'electrical',
        project_start_date: futureDate.toISOString().split('T')[0],
        project_estimated_completion_date: futureCompletionDate.toISOString().split('T')[0],
        area_sq_ft: '1000',
        no_of_rooms: ''
      }

      let validation = validateCompleteProjectForm(formData)
      expect(validation.isValid).toBe(true)

      // User switches to rooms instead of area
      formData.area_sq_ft = ''
      formData.no_of_rooms = '5'

      validation = validateCompleteProjectForm(formData)
      expect(validation.isValid).toBe(true)
    })
  })
})

// Validation helper functions
function validateProjectDetailsForm(formData: any): string[] {
  const errors: string[] = []

  if (!formData.corporation_uuid) {
    errors.push('Corporation is required')
  }

  if (!formData.project_name) {
    errors.push('Project Name is required')
  }

  if (!formData.project_id) {
    errors.push('Project ID is required')
  }

  if (!formData.project_type) {
    errors.push('Project Type is required')
  }

  if (!formData.service_type) {
    errors.push('Service Type is required')
  }

  if (!formData.project_start_date) {
    errors.push('Project Start Date is required')
  }

  if (!formData.project_estimated_completion_date) {
    errors.push('Project Estimated Completion Date is required')
  }

  // Validate area OR rooms requirement
  if (!formData.area_sq_ft && !formData.no_of_rooms) {
    errors.push('Either Area (Sq ft) or Number of Rooms is required')
  }

  // Validate completion date is not in the past (only if it's actually in the past)
  if (formData.project_estimated_completion_date) {
    const completionDate = new Date(formData.project_estimated_completion_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (completionDate < today) {
      errors.push('Completion date cannot be in the past')
    }
  }

  // Validate completion date is after start date
  if (formData.project_start_date && formData.project_estimated_completion_date) {
    const startDate = new Date(formData.project_start_date)
    const completionDate = new Date(formData.project_estimated_completion_date)
    
    if (completionDate <= startDate) {
      errors.push('Completion date must be after start date')
    }
  }

  return errors
}

function validateFileUpload(file: any): string | null {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  
  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Only PDF, JPG, and PNG files are allowed.'
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return 'File size too large. Maximum size is 10MB.'
  }

  return null
}

function validateMultipleFiles(files: any[]): string[] {
  const errors: string[] = []

  files.forEach((file, index) => {
    const error = validateFileUpload(file)
    if (error) {
      errors.push(`File ${index + 1} (${file.name}): ${error}`)
    }
  })

  return errors
}

function validateCompleteProjectForm(formData: any): {
  isValid: boolean
  errors: string[]
  canSubmit: boolean
} {
  const errors = validateProjectDetailsForm(formData)

  return {
    isValid: errors.length === 0,
    errors,
    canSubmit: errors.length === 0
  }
}
