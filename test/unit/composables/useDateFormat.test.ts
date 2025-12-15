import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDateFormat } from '~/composables/useDateFormat'

describe('useDateFormat', () => {
  let dateFormat: ReturnType<typeof useDateFormat>

  beforeEach(() => {
    dateFormat = useDateFormat()
  })

  describe('formatDate', () => {
    it('should format date to MM/DD/YY format', () => {
      const testDate = new Date('2024-01-15')
      expect(dateFormat.formatDate(testDate)).toBe('01/15/24')
    })

    it('should format date string to MM/DD/YY format', () => {
      expect(dateFormat.formatDate('2024-01-15')).toBe('01/15/24')
    })

    it('should return empty string for null or undefined', () => {
      expect(dateFormat.formatDate(null)).toBe('')
      expect(dateFormat.formatDate(undefined)).toBe('')
    })

    it('should return empty string for invalid date', () => {
      expect(dateFormat.formatDate('invalid-date')).toBe('')
    })
  })

  describe('formatDateFullYear', () => {
    it('should format date to MM/DD/YYYY format', () => {
      const testDate = new Date('2024-01-15')
      expect(dateFormat.formatDateFullYear(testDate)).toBe('01/15/2024')
    })

    it('should format date string to MM/DD/YYYY format', () => {
      expect(dateFormat.formatDateFullYear('2024-01-15')).toBe('01/15/2024')
    })
  })

  describe('formatDateTime', () => {
    it('should format date with time to MM/DD/YY HH:MM format', () => {
      const testDate = new Date('2024-01-15T14:30:00')
      expect(dateFormat.formatDateTime(testDate)).toBe('01/15/24 14:30')
    })
  })

  describe('formatRelativeDate', () => {
    it('should return "Today" for today\'s date', () => {
      const today = new Date()
      expect(dateFormat.formatRelativeDate(today)).toBe('Today')
    })

    it('should return "1 day ago" for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(dateFormat.formatRelativeDate(yesterday)).toBe('1 day ago')
    })

    it('should return "2 days ago" for two days ago', () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      expect(dateFormat.formatRelativeDate(twoDaysAgo)).toBe('2 days ago')
    })

    it('should return "1 week ago" for one week ago', () => {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      expect(dateFormat.formatRelativeDate(oneWeekAgo)).toBe('1 week ago')
    })
  })

  describe('getCurrentDate', () => {
    it('should return current date in MM/DD/YY format', () => {
      const currentDate = new Date()
      const expected = dateFormat.formatDate(currentDate)
      expect(dateFormat.getCurrentDate()).toBe(expected)
    })
  })

  describe('parseDate', () => {
    it('should parse MM/DD/YY format to Date object', () => {
      const parsed = dateFormat.parseDate('01/15/24')
      expect(parsed).toBeInstanceOf(Date)
      expect(parsed?.getFullYear()).toBe(2024)
      expect(parsed?.getMonth()).toBe(0) // January is 0
      expect(parsed?.getDate()).toBe(15)
    })

    it('should parse MM/DD/YYYY format to Date object', () => {
      const parsed = dateFormat.parseDate('01/15/2024')
      expect(parsed).toBeInstanceOf(Date)
      expect(parsed?.getFullYear()).toBe(2024)
    })

    it('should return null for invalid date string', () => {
      expect(dateFormat.parseDate('invalid')).toBeNull()
      expect(dateFormat.parseDate('')).toBeNull()
    })
  })

  describe('isOverdue', () => {
    it('should return true for past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(dateFormat.isOverdue(yesterday)).toBe(true)
    })

    it('should return false for future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(dateFormat.isOverdue(tomorrow)).toBe(false)
    })

    it('should return false for today', () => {
      const today = new Date()
      expect(dateFormat.isOverdue(today)).toBe(false)
    })
  })

  describe('isDueSoon', () => {
    it('should return true for dates within next 7 days', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(dateFormat.isDueSoon(tomorrow.toISOString())).toBe(true);

      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 6); // Day 6 is within 7 days
      expect(dateFormat.isDueSoon(nextWeek.toISOString())).toBe(true);
    })

    it('should return false for dates beyond 7 days', () => {
      const nextMonth = new Date()
      nextMonth.setDate(nextMonth.getDate() + 30)
      expect(dateFormat.isDueSoon(nextMonth)).toBe(false)
    })

    it('should return false for past dates', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(dateFormat.isDueSoon(yesterday)).toBe(false)
    })
  })
})
