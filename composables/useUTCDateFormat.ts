import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

export function useUTCDateFormat() {
  /**
   * Convert a local date input (YYYY-MM-DD) to UTC ISO string
   * This is used when storing dates in the database
   */
  const toUTCString = (dateInput: string | Date | null): string | null => {
    if (!dateInput) return null;

    try {
      // If it's already a Date object, convert to ISO string
      if (dateInput instanceof Date) {
        return dayjs(dateInput).utc().toISOString();
      }

      // If it's a string in YYYY-MM-DD format, treat it as local date at midnight
      // and convert to UTC
      const localDate = dayjs(dateInput).startOf("day");
      return localDate.utc().toISOString();
    } catch (error) {
      console.error("Error converting date to UTC:", error);
      return null;
    }
  };

  /**
   * Convert UTC ISO string to local date string (YYYY-MM-DD)
   * This is used when displaying dates in forms
   * Converts UTC date to local timezone first, then formats as date-only string
   */
  const fromUTCString = (utcString: string | null): string => {
    if (!utcString) return "";

    try {
      // Parse as UTC, then convert to local timezone, then format as date-only
      // This ensures the date shown matches what the user selected in their local timezone
      return dayjs.utc(utcString).local().format("YYYY-MM-DD");
    } catch (error) {
      console.error("Error converting UTC date to local:", error);
      return "";
    }
  };

  /**
   * Format UTC date for display in the user's local timezone
   * This is used in tables and UI components
   */
  const formatForDisplay = (
    utcString: string | null,
    format: string = "MMM DD, YYYY"
  ): string => {
    if (!utcString) return "";

    try {
      return dayjs.utc(utcString).format(format);
    } catch (error) {
      console.error("Error formatting date for display:", error);
      return "";
    }
  };

  /**
   * Get current date in UTC ISO format
   */
  const getCurrentUTC = (): string => {
    return dayjs.utc().toISOString();
  };

  /**
   * Get current date in local YYYY-MM-DD format for form inputs
   */
  const getCurrentLocal = (): string => {
    return dayjs().format("YYYY-MM-DD");
  };

  /**
   * Create date range parameters for API calls
   * Converts local date range to UTC range
   */
  const createDateRangeParams = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return null;

    try {
      const startUTC = dayjs(startDate).startOf("day").utc().toISOString();
      const endUTC = dayjs(endDate).endOf("day").utc().toISOString();

      return {
        start_date: startUTC,
        end_date: endUTC,
      };
    } catch (error) {
      console.error("Error creating date range params:", error);
      return null;
    }
  };

  /**
   * Check if a UTC date is overdue
   */
  const isOverdue = (utcDateString: string | null): boolean => {
    if (!utcDateString) return false;

    try {
      const date = dayjs.utc(utcDateString);
      const today = dayjs.utc().startOf("day");
      return date.isBefore(today);
    } catch (error) {
      console.error("Error checking if date is overdue:", error);
      return false;
    }
  };

  /**
   * Check if a UTC date is due soon (within next 7 days)
   */
  const isDueSoon = (
    utcDateString: string | null,
    daysThreshold: number = 7
  ): boolean => {
    if (!utcDateString) return false;

    try {
      const date = dayjs.utc(utcDateString);
      const today = dayjs.utc().startOf("day");
      const threshold = today.add(daysThreshold, "day");

      return date.isAfter(today) && date.isSameOrBefore(threshold);
    } catch (error) {
      console.error("Error checking if date is due soon:", error);
      return false;
    }
  };

  /**
   * Validate if a date string is in correct format
   */
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;

    try {
      const date = dayjs(dateString);
      return date.isValid();
    } catch (error) {
      return false;
    }
  };

  /**
   * Get timezone offset in minutes
   */
  const getTimezoneOffset = (): number => {
    return dayjs().utcOffset();
  };

  /**
   * Get user's timezone
   */
  const getUserTimezone = (): string => {
    return dayjs.tz.guess();
  };

  return {
    toUTCString,
    fromUTCString,
    formatForDisplay,
    getCurrentUTC,
    getCurrentLocal,
    createDateRangeParams,
    isOverdue,
    isDueSoon,
    isValidDate,
    getTimezoneOffset,
    getUserTimezone,
    dayjs, // Export dayjs instance for advanced usage
  };
}
