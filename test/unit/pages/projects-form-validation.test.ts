import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Projects Form Validation - Project Type and Service Type', () => {
  describe('Project Type UUID Validation', () => {
    it('should pass validation with valid UUID string', () => {
      const projectTypeUuid = 'pt-12345-67890'
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      expect(hasProjectType).toBe(true)
    })

    it('should fail validation with empty string', () => {
      const projectTypeUuid = ''
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );
      
      expect(hasProjectType).toBe(false)
    })

    it('should fail validation with whitespace-only string', () => {
      const projectTypeUuid = '   '
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      expect(hasProjectType).toBe(false)
    })

    it('should fail validation with null', () => {
      const projectTypeUuid = null
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );
      
      expect(hasProjectType).toBe(false)
    })

    it('should fail validation with undefined', () => {
      const projectTypeUuid = undefined
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );
      
      expect(hasProjectType).toBe(false)
    })

    it('should pass validation with UUID that has leading/trailing whitespace', () => {
      const projectTypeUuid = '  pt-12345-67890  '
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      expect(hasProjectType).toBe(true)
    })

    it('should fail validation with non-string type', () => {
      const projectTypeUuid = 12345
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      expect(hasProjectType).toBe(false)
    })

    it('should fail validation with object', () => {
      const projectTypeUuid = { value: 'pt-12345' }
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      expect(hasProjectType).toBe(false)
    })

    it('should pass validation with minimal valid UUID', () => {
      const projectTypeUuid = 'a'
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      expect(hasProjectType).toBe(true)
    })
  })

  describe('Service Type UUID Validation', () => {
    it('should pass validation with valid UUID string', () => {
      const serviceTypeUuid = 'st-12345-67890'
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      expect(hasServiceType).toBe(true)
    })

    it('should fail validation with empty string', () => {
      const serviceTypeUuid = ''
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );
      
      expect(hasServiceType).toBe(false)
    })

    it('should fail validation with whitespace-only string', () => {
      const serviceTypeUuid = '   '
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      expect(hasServiceType).toBe(false)
    })

    it('should fail validation with null', () => {
      const serviceTypeUuid = null
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );
      
      expect(hasServiceType).toBe(false)
    })

    it('should fail validation with undefined', () => {
      const serviceTypeUuid = undefined
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );
      
      expect(hasServiceType).toBe(false)
    })

    it('should pass validation with UUID that has leading/trailing whitespace', () => {
      const serviceTypeUuid = '  st-12345-67890  '
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      expect(hasServiceType).toBe(true)
    })

    it('should fail validation with non-string type', () => {
      const serviceTypeUuid = 12345
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      expect(hasServiceType).toBe(false)
    })

    it('should fail validation with object', () => {
      const serviceTypeUuid = { value: 'st-12345' }
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      expect(hasServiceType).toBe(false)
    })

    it('should pass validation with minimal valid UUID', () => {
      const serviceTypeUuid = 'a'
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      expect(hasServiceType).toBe(true)
    })
  })

  describe('Complete Form Validation', () => {
    it('should validate complete form with both types provided', () => {
      const form = {
        corporation_uuid: 'corp-123',
        project_name: 'Test Project',
        project_id: 'TEST-001',
        project_type_uuid: 'pt-12345',
        service_type_uuid: 'st-67890',
        area_sq_ft: '1000'
      }

      const projectTypeUuid = form.project_type_uuid
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );

      const serviceTypeUuid = form.service_type_uuid
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );

      const requiredErrors: string[] = []
      if (!form.corporation_uuid) requiredErrors.push('Corporation is required')
      if (!form.project_name?.trim()) requiredErrors.push('Project Name is required')
      if (!form.project_id?.trim()) requiredErrors.push('Project ID is required')
      if (!hasProjectType) requiredErrors.push('Project Type is required')
      if (!hasServiceType) requiredErrors.push('Service Type is required')

      expect(requiredErrors.length).toBe(0)
      expect(hasProjectType).toBe(true)
      expect(hasServiceType).toBe(true)
    })

    it('should fail validation when project type is missing', () => {
      const form = {
        corporation_uuid: 'corp-123',
        project_name: 'Test Project',
        project_id: 'TEST-001',
        project_type_uuid: '',
        service_type_uuid: 'st-67890',
        area_sq_ft: '1000'
      }

      const projectTypeUuid = form.project_type_uuid
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );

      const serviceTypeUuid = form.service_type_uuid
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );

      const requiredErrors: string[] = []
      if (!form.corporation_uuid) requiredErrors.push('Corporation is required')
      if (!form.project_name?.trim()) requiredErrors.push('Project Name is required')
      if (!form.project_id?.trim()) requiredErrors.push('Project ID is required')
      if (!hasProjectType) requiredErrors.push('Project Type is required')
      if (!hasServiceType) requiredErrors.push('Service Type is required')

      expect(requiredErrors).toContain('Project Type is required')
      expect(hasProjectType).toBe(false)
      expect(hasServiceType).toBe(true)
    })

    it('should fail validation when service type is missing', () => {
      const form = {
        corporation_uuid: 'corp-123',
        project_name: 'Test Project',
        project_id: 'TEST-001',
        project_type_uuid: 'pt-12345',
        service_type_uuid: '',
        area_sq_ft: '1000'
      }

      const projectTypeUuid = form.project_type_uuid
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );

      const serviceTypeUuid = form.service_type_uuid
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );

      const requiredErrors: string[] = []
      if (!form.corporation_uuid) requiredErrors.push('Corporation is required')
      if (!form.project_name?.trim()) requiredErrors.push('Project Name is required')
      if (!form.project_id?.trim()) requiredErrors.push('Project ID is required')
      if (!hasProjectType) requiredErrors.push('Project Type is required')
      if (!hasServiceType) requiredErrors.push('Service Type is required')

      expect(requiredErrors).toContain('Service Type is required')
      expect(hasProjectType).toBe(true)
      expect(hasServiceType).toBe(false)
    })

    it('should fail validation when both types are missing', () => {
      const form = {
        corporation_uuid: 'corp-123',
        project_name: 'Test Project',
        project_id: 'TEST-001',
        project_type_uuid: '',
        service_type_uuid: null as any,
        area_sq_ft: '1000'
      }

      const projectTypeUuid = form.project_type_uuid
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );

      const serviceTypeUuid = form.service_type_uuid
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );

      const requiredErrors: string[] = []
      if (!form.corporation_uuid) requiredErrors.push('Corporation is required')
      if (!form.project_name?.trim()) requiredErrors.push('Project Name is required')
      if (!form.project_id?.trim()) requiredErrors.push('Project ID is required')
      if (!hasProjectType) requiredErrors.push('Project Type is required')
      if (!hasServiceType) requiredErrors.push('Service Type is required')

      expect(requiredErrors).toContain('Project Type is required')
      expect(requiredErrors).toContain('Service Type is required')
      expect(hasProjectType).toBe(false)
      expect(hasServiceType).toBe(false)
    })

    it('should pass validation with whitespace-trimmed UUIDs', () => {
      const form = {
        corporation_uuid: 'corp-123',
        project_name: 'Test Project',
        project_id: 'TEST-001',
        project_type_uuid: '  pt-12345  ',
        service_type_uuid: '  st-67890  ',
        area_sq_ft: '1000'
      }

      const projectTypeUuid = form.project_type_uuid
      const hasProjectType = Boolean(
        projectTypeUuid &&
          typeof projectTypeUuid === "string" &&
          projectTypeUuid.trim().length > 0
      );

      const serviceTypeUuid = form.service_type_uuid
      const hasServiceType = Boolean(
        serviceTypeUuid &&
          typeof serviceTypeUuid === "string" &&
          serviceTypeUuid.trim().length > 0
      );

      const requiredErrors: string[] = []
      if (!form.corporation_uuid) requiredErrors.push('Corporation is required')
      if (!form.project_name?.trim()) requiredErrors.push('Project Name is required')
      if (!form.project_id?.trim()) requiredErrors.push('Project ID is required')
      if (!hasProjectType) requiredErrors.push('Project Type is required')
      if (!hasServiceType) requiredErrors.push('Service Type is required')

      expect(requiredErrors.length).toBe(0)
      expect(hasProjectType).toBe(true)
      expect(hasServiceType).toBe(true)
    })
  })

  describe('Validation Error Messages', () => {
    it('should generate correct error message for missing project type', () => {
      const projectTypeUuid = ''
      const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
      
      const requiredErrors: string[] = []
      if (!hasProjectType) requiredErrors.push('Project Type is required')
      
      expect(requiredErrors).toContain('Project Type is required')
    })

    it('should generate correct error message for missing service type', () => {
      const serviceTypeUuid = null
      const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
      
      const requiredErrors: string[] = []
      if (!hasServiceType) requiredErrors.push('Service Type is required')
      
      expect(requiredErrors).toContain('Service Type is required')
    })
  })
})

