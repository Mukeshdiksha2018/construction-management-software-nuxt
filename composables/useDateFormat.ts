import { computed } from 'vue'
import { useUTCDateFormat } from "./useUTCDateFormat";

export const useDateFormat = () => {
  const {
    formatForDisplay,
    isOverdue: utcIsOverdue,
    isDueSoon: utcIsDueSoon,
  } = useUTCDateFormat();
  // Format date to MM/DD/YY format
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "";
      }

      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const day = dateObj.getDate().toString().padStart(2, "0");
      const year = dateObj.getFullYear().toString().slice(-2);

      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Format date to MM/DD/YYYY format (full year)
  const formatDateFullYear = (
    date: string | Date | null | undefined
  ): string => {
    if (!date) return "";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "";
      }

      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const day = dateObj.getDate().toString().padStart(2, "0");
      const year = dateObj.getFullYear().toString();

      return `${month}/${day}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };

  // Format date to MM/DD/YY format with time
  const formatDateTime = (date: string | Date | null | undefined): string => {
    if (!date) return "";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "";
      }

      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const day = dateObj.getDate().toString().padStart(2, "0");
      const year = dateObj.getFullYear().toString().slice(-2);
      const hours = dateObj.getHours().toString().padStart(2, "0");
      const minutes = dateObj.getMinutes().toString().padStart(2, "0");

      return `${month}/${day}/${year} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date time:", error);
      return "";
    }
  };

  // Format date to relative time (e.g., "2 days ago", "1 week ago")
  const formatRelativeDate = (
    date: string | Date | null | undefined
  ): string => {
    if (!date) return "";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return "";
      }

      const now = new Date();
      const diffInMs = now.getTime() - dateObj.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      const diffInWeeks = Math.floor(diffInDays / 7);
      const diffInMonths = Math.floor(diffInDays / 30);
      const diffInYears = Math.floor(diffInDays / 365);

      if (diffInYears > 0) {
        return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`;
      } else if (diffInMonths > 0) {
        return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
      } else if (diffInWeeks > 0) {
        return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
      } else if (diffInDays > 0) {
        return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
      } else {
        return "Today";
      }
    } catch (error) {
      console.error("Error formatting relative date:", error);
      return "";
    }
  };

  // Get current date in MM/DD/YY format
  const getCurrentDate = (): string => {
    return formatDate(new Date());
  };

  // Get current date in MM/DD/YYYY format
  const getCurrentDateFullYear = (): string => {
    return formatDateFullYear(new Date());
  };

  // Parse date from MM/DD/YY format to Date object
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;

    try {
      const parts = dateString.split("/");
      if (parts.length !== 3) return null;

      const [month, day, year] = parts;
      if (!month || !day || !year) return null;

      const fullYear = year.length === 2 ? `20${year}` : year;
      const date = new Date(
        parseInt(fullYear),
        parseInt(month) - 1,
        parseInt(day)
      );

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }

      return date;
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  };

  // Check if date is overdue (past due date) - now using UTC
  const isOverdue = (utcDateString: string | null | undefined): boolean => {
    return utcIsOverdue(utcDateString);
  };

  // Check if date is due soon (within next 7 days) - now using UTC
  const isDueSoon = (utcDateString: string | null | undefined): boolean => {
    return utcIsDueSoon(utcDateString);
  };

  // Get number of days ago from a given date
  const getDaysAgo = (date: string | Date | null | undefined): number => {
    if (!date) return 0;

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 0;
      }

      const now = new Date();
      const diffInMs = now.getTime() - dateObj.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      return Math.max(0, diffInDays);
    } catch (error) {
      console.error("Error calculating days ago:", error);
      return 0;
    }
  };

  return {
    formatDate,
    formatDateFullYear,
    formatDateTime,
    formatRelativeDate,
    getCurrentDate,
    getCurrentDateFullYear,
    parseDate,
    isOverdue,
    isDueSoon,
    getDaysAgo,
  };
}
