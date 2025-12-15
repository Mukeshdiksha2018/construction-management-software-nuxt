import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { CalendarDate, getLocalTimeZone } from '@internationalized/date';

export const useDateRangeStore = defineStore("dateRange", () => {
  // Get current year and today's date for default range
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayCalendar = new CalendarDate(currentYear, today.getMonth() + 1, today.getDate());

  const dateRange = ref({
    start: new CalendarDate(currentYear, 1, 1),
    end: todayCalendar
  });

  // Computed properties for API calls - now returns UTC timestamps
  const startDateISO = computed(() => {
    const date = dateRange.value.start.toDate(getLocalTimeZone());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const endDateISO = computed(() => {
    const date = dateRange.value.end.toDate(getLocalTimeZone());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const dateRangeParams = computed(() => {
    const start = startDateISO.value;
    const end = endDateISO.value;

    if (start && end) {
      // Convert to UTC timestamps for proper date range filtering
      // Start date: beginning of the day (00:00:00.000)
      const startUTC = new Date(start + "T00:00:00.000Z").toISOString();

      // End date: end of the day (23:59:59.999) to include the full day
      const endUTC = new Date(end + "T23:59:59.999Z").toISOString();

      // Debug logging (remove in production)
      // console.log("Date range params:", {
      //   start_date: startUTC,
      //   end_date: endUTC,
      //   original_start: start,
      //   original_end: end,
      //   calendar_start: dateRange.value.start.toString(),
      //   calendar_end: dateRange.value.end.toString(),
      // });

      return {
        start_date: startUTC,
        end_date: endUTC,
      };
    }

    return undefined;
  });

  // Actions
  const setDateRange = (newDateRange: { start: CalendarDate; end: CalendarDate }) => {
    dateRange.value = newDateRange;
  };

  const resetToCurrentYear = () => {
    const currentYear = new Date().getFullYear();
    const today = new Date();
    const todayCalendar = new CalendarDate(currentYear, today.getMonth() + 1, today.getDate());
    
    dateRange.value = {
      start: new CalendarDate(currentYear, 1, 1),
      end: todayCalendar
    };
  };

  return {
    dateRange,
    startDateISO,
    endDateISO,
    dateRangeParams,
    setDateRange,
    resetToCurrentYear
  };
});
