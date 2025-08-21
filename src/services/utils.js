import moment from "moment-timezone";
import fs from "fs";
import { writeToPath } from "fast-csv";

export function calcUptime(statuses, businessHours, timezone, maxTimestamp, windowType) {
  if (!statuses.length) {
    return {
      uptimeMinutes: 0,
      downtimeMinutes: 0,
      uptimeHours: 0,
      downtimeHours: 0,
    };
  }

  let end = moment.utc(maxTimestamp).tz(timezone);
  let start;
  if (windowType === "hour") start = end.clone().subtract(1, "hours");
  if (windowType === "day") start = end.clone().subtract(1, "days");
  if (windowType === "week") start = end.clone().subtract(7, "days");

  // Filter statuses within the time window
  let filtered = statuses.filter(
    s => s.local_time.isBetween(start, end, null, "[]")
  );

  // Sort by time
  filtered.sort((a, b) => a.local_time - b.local_time);

  // Get business hours intervals within the time window
  const businessIntervals = getBusinessHoursIntervals(businessHours, start, end, timezone);
  
  if (businessIntervals.length === 0) {
    // No business hours in this window
    return {
      uptimeMinutes: 0,
      downtimeMinutes: 0,
      uptimeHours: 0,
      downtimeHours: 0,
    };
  }

  let totalUptimeMinutes = 0;
  let totalDowntimeMinutes = 0;

  // Process each business hours interval
  for (const interval of businessIntervals) {
    const { uptime, downtime } = calculateUptimeForInterval(filtered, interval);
    totalUptimeMinutes += uptime;
    totalDowntimeMinutes += downtime;
  }

  return {
    uptimeMinutes: totalUptimeMinutes,
    downtimeMinutes: totalDowntimeMinutes,
    uptimeHours: +(totalUptimeMinutes / 60).toFixed(2),
    downtimeHours: +(totalDowntimeMinutes / 60).toFixed(2),
  };
}

/**
 * Get business hours intervals within a time window
 * @param {Array} businessHours - Array of business hours objects
 * @param {moment} start - Start of time window
 * @param {moment} end - End of time window
 * @param {string} timezone - Store timezone
 * @returns {Array} Array of business hours intervals
 */
function getBusinessHoursIntervals(businessHours, start, end, timezone) {
  const intervals = [];
  
  // If no business hours data, assume 24/7 operation
  if (!businessHours || businessHours.length === 0) {
    intervals.push({ start: start.clone(), end: end.clone() });
    return intervals;
  }

  // Create a map of day of week to business hours
  const hoursMap = {};
  businessHours.forEach(bh => {
    if (!hoursMap[bh.dayOfWeek]) {
      hoursMap[bh.dayOfWeek] = [];
    }
    hoursMap[bh.dayOfWeek].push({
      start: bh.start_time_local,
      end: bh.end_time_local
    });
  });

  let current = start.clone();
  
  while (current.isBefore(end)) {
    const dayOfWeek = current.day(); // 0 = Sunday, 1 = Monday, etc.
    const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0, Sunday=6
    
    if (hoursMap[mondayBasedDay]) {
      // Process each business hours period for this day
      for (const hours of hoursMap[mondayBasedDay]) {
        const dayStart = current.clone().startOf('day');
        const periodStart = parseTimeString(hours.start, dayStart);
        const periodEnd = parseTimeString(hours.end, dayStart);
        
        // Handle overnight periods (end time is next day)
        if (periodEnd.isBefore(periodStart)) {
          periodEnd.add(1, 'day');
        }
        
        // Find intersection with our time window
        const intervalStart = moment.max(periodStart, start);
        const intervalEnd = moment.min(periodEnd, end);
        
        if (intervalStart.isBefore(intervalEnd)) {
          intervals.push({
            start: intervalStart,
            end: intervalEnd
          });
        }
      }
    }
    
    current.add(1, 'day').startOf('day');
  }
  
  return intervals;
}

/**
 * Parse time string (HH:mm:ss) and combine with date
 * @param {string} timeStr - Time string in format "HH:mm:ss"
 * @param {moment} baseDate - Base date to combine with time
 * @returns {moment} Moment object with date and time
 */
function parseTimeString(timeStr, baseDate) {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return baseDate.clone().hour(hours).minute(minutes).second(seconds || 0);
}

/**
 * Calculate uptime for a specific business hours interval
 * @param {Array} statuses - Array of status polls (sorted by time)
 * @param {Object} interval - Business hours interval with start and end moments
 * @returns {Object} Object with uptime and downtime in minutes
 */
function calculateUptimeForInterval(statuses, interval) {
  // Filter statuses that fall within this interval
  const relevantStatuses = statuses.filter(s => 
    s.local_time.isBetween(interval.start, interval.end, null, "[]")
  );
  
  const intervalDurationMinutes = interval.end.diff(interval.start, 'minutes');
  
  if (relevantStatuses.length === 0) {
    // No polls during business hours - assume downtime
    return { uptime: 0, downtime: intervalDurationMinutes };
  }
  
  let uptime = 0;
  let downtime = 0;
  
  // Handle time before first poll
  const firstPoll = relevantStatuses[0];
  const preFirstPollMinutes = firstPoll.local_time.diff(interval.start, 'minutes');
  if (preFirstPollMinutes > 0) {
    // Assume the first poll's status extends backward to interval start
    if (firstPoll.status === 'active') {
      uptime += preFirstPollMinutes;
    } else {
      downtime += preFirstPollMinutes;
    }
  }
  
  // Handle time between polls
  for (let i = 0; i < relevantStatuses.length - 1; i++) {
    const current = relevantStatuses[i];
    const next = relevantStatuses[i + 1];
    
    const durationMinutes = next.local_time.diff(current.local_time, 'minutes');
    
    if (current.status === 'active') {
      uptime += durationMinutes;
    } else {
      downtime += durationMinutes;
    }
  }
  
  // Handle time after last poll
  const lastPoll = relevantStatuses[relevantStatuses.length - 1];
  const postLastPollMinutes = interval.end.diff(lastPoll.local_time, 'minutes');
  if (postLastPollMinutes > 0) {
    if (lastPoll.status === 'active') {
      uptime += postLastPollMinutes;
    } else {
      downtime += postLastPollMinutes;
    }
  }
  
  return { uptime, downtime };
}

/**
 * Save report results as CSV file
 * @param {Array} results - Array of objects to be saved as CSV
 * @param {string} filePath - Path where the CSV file should be saved
 * @returns {Promise} Promise that resolves when file is saved
 */
export async function saveAsCSV(results, filePath) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filePath);
    writeToPath(filePath, results, { headers: true })
      .on("finish", resolve)
      .on("error", reject);
  });
}

/**
 * Get unique store IDs from an array of status objects
 * @param {Array} statuses - Array of status objects with store_id property
 * @returns {Array} Array of unique store IDs
 */
export function getUniqueStoreIds(statuses) {
  return [...new Set(statuses.map(s => s.store_id))];
}

/**
 * Find the maximum timestamp from an array of status objects
 * @param {Array} statuses - Array of status objects with timestamp_utc property
 * @returns {Date} Maximum timestamp
 */
export function findMaxTimestamp(statuses) {
  return statuses.reduce(
    (max, s) => (s.timestamp_utc > max ? s.timestamp_utc : max),
    new Date(0)
  );
}

/**
 * Convert timestamps to local timezone for a store
 * @param {Array} storeStatuses - Array of store status objects
 * @param {string} storeTimezone - Store timezone string
 * @returns {Array} Array of status objects with local_time property added
 */
export function convertToLocalTime(storeStatuses, storeTimezone) {
  return storeStatuses.map(s => ({
    timestamp_utc: s.timestamp_utc,
    local_time: moment.utc(s.timestamp_utc).tz(storeTimezone),
    status: s.status,
  }));
}

/**
 * Filter data by store ID
 * @param {Array} data - Array of objects with store_id property
 * @param {string} storeId - Store ID to filter by
 * @returns {Array} Filtered array
 */
export function filterByStoreId(data, storeId) {
  return data.filter(item => item.store_id === storeId);
}

/**
 * Get store timezone or default
 * @param {Array} timezones - Array of timezone objects
 * @param {string} storeId - Store ID to find timezone for
 * @param {string} defaultTimezone - Default timezone if not found
 * @returns {string} Store timezone string
 */
export function getStoreTimezone(timezones, storeId, defaultTimezone = "America/Chicago") {
  return timezones.find(t => t.store_id === storeId)?.timezone_str || defaultTimezone;
}
