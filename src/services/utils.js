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

  let filtered = statuses.filter(
    s => s.local_time.isBetween(start, end, null, "[]")
  );

  if (filtered.length === 0) {
    // If no polls, assume downtime
    return {
      uptimeMinutes: 0,
      downtimeMinutes: windowType === "hour" ? 60 : 0,
      uptimeHours: 0,
      downtimeHours: windowType === "day" ? 24 : windowType === "week" ? 24 * 7 : 0,
    };
  }

  // Sort by time
  filtered.sort((a, b) => a.local_time - b.local_time);

  let uptime = 0;
  let downtime = 0;

  // Interpolate between polls
  for (let i = 0; i < filtered.length - 1; i++) {
    const curr = filtered[i];
    const next = filtered[i + 1];

    let diffMinutes = next.local_time.diff(curr.local_time, "minutes");

    if (curr.status === "active") uptime += diffMinutes;
    else downtime += diffMinutes;
  }

  // Extend last status till end of window
  const lastPoll = filtered[filtered.length - 1];
  let tailMinutes = end.diff(lastPoll.local_time, "minutes");
  if (lastPoll.status === "active") uptime += tailMinutes;
  else downtime += tailMinutes;

  // Normalize results
  return {
    uptimeMinutes: uptime,
    downtimeMinutes: downtime,
    uptimeHours: +(uptime / 60).toFixed(2),
    downtimeHours: +(downtime / 60).toFixed(2),
  };
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
