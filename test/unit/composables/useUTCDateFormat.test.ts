import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import dayjs from 'dayjs'

describe('useUTCDateFormat', () => {
  let dateFormat: ReturnType<typeof useUTCDateFormat>

  beforeEach(() => {
    dateFormat = useUTCDateFormat()
  })

  describe('toUTCString', () => {
    it('should convert YYYY-MM-DD string to UTC ISO string', () => {
      const result = dateFormat.toUTCString('2025-01-15')
      expect(result).toBeTruthy()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should convert Date object to UTC ISO string', () => {
      const date = new Date('2025-01-15T10:30:00')
      const result = dateFormat.toUTCString(date)
      expect(result).toBeTruthy()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should return null for null input', () => {
      expect(dateFormat.toUTCString(null)).toBeNull()
    })

    it('should handle date string at midnight correctly', () => {
      const result = dateFormat.toUTCString('2025-01-15')
      // Should be a valid UTC ISO string
      expect(result).toBeTruthy()
      const parsed = dayjs.utc(result)
      expect(parsed.isValid()).toBe(true)
    })
  })

  describe('fromUTCString', () => {
    it('should convert UTC ISO string to local YYYY-MM-DD', () => {
      // Create a UTC date for January 15, 2025 at midnight UTC
      const utcDate = '2025-01-15T00:00:00.000Z'
      const result = dateFormat.fromUTCString(utcDate)
      
      // The result should be in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      // The date should match the original date (accounting for timezone)
      // When converted to local, it should still represent January 15 in the user's timezone
      const localDate = dayjs.utc(utcDate).local()
      expect(result).toBe(localDate.format('YYYY-MM-DD'))
    })

    it('should handle UTC date that converts to same local date', () => {
      // For a date in UTC that, when converted to local, stays on the same day
      // This tests the fix: no one-day shift
      const utcDate = '2025-01-15T08:00:00.000Z' // 8 AM UTC = midnight PST (UTC-8)
      const result = dateFormat.fromUTCString(utcDate)
      
      // Should be in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      // Should correctly convert to local timezone
      const expected = dayjs.utc(utcDate).local().format('YYYY-MM-DD')
      expect(result).toBe(expected)
    })

    it('should handle UTC date that would shift to previous day without fix', () => {
      // This tests the critical fix: a UTC date that, when parsed incorrectly,
      // would show as the previous day. With the fix, it should show correctly.
      // Example: 2025-01-15T00:00:00Z in UTC-8 timezone should show as 2025-01-14 locally
      // But if we select Jan 15 in the calendar, it should store as 2025-01-15T08:00:00Z (midnight PST)
      // and when we read it back, it should show as 2025-01-15
      
      // Simulate: User selects Jan 15, 2025 in PST (UTC-8)
      // This gets stored as 2025-01-15T08:00:00.000Z (midnight PST = 8 AM UTC)
      const storedUTC = '2025-01-15T08:00:00.000Z'
      const result = dateFormat.fromUTCString(storedUTC)
      
      // Should show as Jan 15 (the date the user selected)
      // In PST, 2025-01-15T08:00:00Z = 2025-01-15 00:00:00 PST
      const expected = dayjs.utc(storedUTC).local().format('YYYY-MM-DD')
      expect(result).toBe(expected)
      
      // The result should be 2025-01-15 (not 2025-01-14)
      // This is the key fix: using .local() before formatting
      expect(result).toMatch(/2025-01-15/)
    })

    it('should return empty string for null input', () => {
      expect(dateFormat.fromUTCString(null)).toBe('')
    })

    it('should return empty string for empty string input', () => {
      expect(dateFormat.fromUTCString('')).toBe('')
    })

    it('should handle edge case: UTC date at end of day', () => {
      const utcDate = '2025-01-15T23:59:59.999Z'
      const result = dateFormat.fromUTCString(utcDate)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      // Should convert correctly to local timezone
      const expected = dayjs.utc(utcDate).local().format('YYYY-MM-DD')
      expect(result).toBe(expected)
    })
  })

  describe('Date selection round-trip (critical fix test)', () => {
    it('should preserve selected date through round-trip conversion', () => {
      // Simulate the user selecting January 15, 2025 in their local timezone
      const selectedDate = '2025-01-15'
      
      // Step 1: Convert to UTC (as done when saving)
      const utcString = dateFormat.toUTCString(selectedDate)
      expect(utcString).toBeTruthy()
      
      // Step 2: Convert back to local (as done when displaying)
      const localString = dateFormat.fromUTCString(utcString)
      
      // Step 3: Verify the date matches what was selected
      // This is the critical test: the date should NOT shift by one day
      expect(localString).toBe(selectedDate)
    })

    it('should handle multiple date selections without drift', () => {
      const testDates = [
        '2025-01-01',
        '2025-01-15',
        '2025-02-28',
        '2025-12-31'
      ]
      
      for (const date of testDates) {
        const utcString = dateFormat.toUTCString(date)
        const localString = dateFormat.fromUTCString(utcString)
        expect(localString).toBe(date)
      }
    })

    it('should handle date selection at year boundaries', () => {
      const dates = ['2024-12-31', '2025-01-01']
      
      for (const date of dates) {
        const utcString = dateFormat.toUTCString(date)
        const localString = dateFormat.fromUTCString(utcString)
        expect(localString).toBe(date)
      }
    })
  })

  describe('formatForDisplay', () => {
    it('should format UTC date for display', () => {
      const utcDate = '2025-01-15T00:00:00.000Z'
      const result = dateFormat.formatForDisplay(utcDate)
      expect(result).toBeTruthy()
      expect(result).toMatch(/Jan 15, 2025/i)
    })

    it('should use custom format when provided', () => {
      const utcDate = '2025-01-15T00:00:00.000Z'
      const result = dateFormat.formatForDisplay(utcDate, 'YYYY/MM/DD')
      expect(result).toBe('2025/01/15')
    })

    it('should return empty string for null input', () => {
      expect(dateFormat.formatForDisplay(null)).toBe('')
    })
  })

  describe('getCurrentUTC', () => {
    it('should return current date in UTC ISO format', () => {
      const result = dateFormat.getCurrentUTC()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })

  describe('getCurrentLocal', () => {
    it('should return current date in local YYYY-MM-DD format', () => {
      const result = dateFormat.getCurrentLocal()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('createDateRangeParams', () => {
    it('should create date range params with UTC dates', () => {
      const result = dateFormat.createDateRangeParams('2025-01-01', '2025-01-31')
      expect(result).toBeTruthy()
      expect(result?.start_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(result?.end_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should return null for invalid inputs', () => {
      expect(dateFormat.createDateRangeParams('', '2025-01-31')).toBeNull()
      expect(dateFormat.createDateRangeParams('2025-01-01', '')).toBeNull()
    })
  })

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = dayjs().subtract(1, 'day').utc().toISOString()
      expect(dateFormat.isOverdue(pastDate)).toBe(true)
    })

    it('should return false for future dates', () => {
      const futureDate = dayjs().add(1, 'day').utc().toISOString()
      expect(dateFormat.isOverdue(futureDate)).toBe(false)
    })

    it('should return false for null input', () => {
      expect(dateFormat.isOverdue(null)).toBe(false)
    })
  })

  describe('isDueSoon', () => {
    it('should return true for dates within threshold', () => {
      const soonDate = dayjs().add(3, 'day').utc().toISOString()
      expect(dateFormat.isDueSoon(soonDate, 7)).toBe(true)
    })

    it('should return false for dates beyond threshold', () => {
      const farDate = dayjs().add(10, 'day').utc().toISOString()
      expect(dateFormat.isDueSoon(farDate, 7)).toBe(false)
    })

    it('should return false for null input', () => {
      expect(dateFormat.isDueSoon(null)).toBe(false)
    })
  })

  describe('isValidDate', () => {
    it('should return true for valid date strings', () => {
      expect(dateFormat.isValidDate('2025-01-15')).toBe(true)
      expect(dateFormat.isValidDate('2025/01/15')).toBe(true)
    })

    it('should return false for invalid date strings', () => {
      expect(dateFormat.isValidDate('invalid')).toBe(false)
      expect(dateFormat.isValidDate('')).toBe(false)
    })
  })

  describe('getTimezoneOffset', () => {
    it('should return timezone offset in minutes', () => {
      const offset = dateFormat.getTimezoneOffset()
      expect(typeof offset).toBe('number')
      // Offset should be between -720 and 840 minutes (reasonable timezone range)
      expect(offset).toBeGreaterThanOrEqual(-720)
      expect(offset).toBeLessThanOrEqual(840)
    })
  })

  describe('getUserTimezone', () => {
    it('should return a valid timezone string', () => {
      const tz = dateFormat.getUserTimezone()
      expect(typeof tz).toBe('string')
      expect(tz.length).toBeGreaterThan(0)
      // Should be a valid IANA timezone (contains / or is a known abbreviation)
      expect(tz).toMatch(/^[A-Z][a-z]+\/[A-Z][a-z]+|[A-Z]{2,}$/)
    })
  })
})

