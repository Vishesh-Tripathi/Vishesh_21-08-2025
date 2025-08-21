import { v4 as uuidv4 } from "uuid";

import StoreStatus from "../models/StoreStatus.js";
import BusinessHours from "../models/BusinessHours.js";
import StoreTimezone from "../models/StoreTimezone.js";
import Report from "../models/Report.js";
import { 
  calcUptime, 
  saveAsCSV, 
  getUniqueStoreIds, 
  findMaxTimestamp, 
  convertToLocalTime, 
  filterByStoreId, 
  getStoreTimezone 
} from "./utils.js";

/**
 * Trigger a new report generation
 */
export const triggerReport = async () => {
  const reportId = uuidv4();

  // Create a new Report entry with status "Running"
  await Report.create({ report_id: reportId, status: "Running" });

  // Run calculations in background
  setTimeout(async () => {
    try {
      // 1. Fetch all data
      const statuses = await StoreStatus.find({});
      const businessHours = await BusinessHours.find({});
      const timezones = await StoreTimezone.find({});

      // 2. Find the max timestamp (current time reference)
      const maxTimestamp = findMaxTimestamp(statuses);

      // 3. Get unique store IDs
      const uniqueStoreIds = getUniqueStoreIds(statuses);

      // 4. Prepare results
      let results = [];

      for (let storeId of uniqueStoreIds) {
        let storeStatuses = filterByStoreId(statuses, storeId);
        let storeHours = filterByStoreId(businessHours, storeId);
        let storeTimezone = getStoreTimezone(timezones, storeId);

        // Convert timestamps to local timezone
        storeStatuses = convertToLocalTime(storeStatuses, storeTimezone);

        // Calculate uptime/downtime
        const lastHour = calcUptime(
          storeStatuses,
          storeHours,
          storeTimezone,
          maxTimestamp,
          "hour"
        );
        const lastDay = calcUptime(
          storeStatuses,
          storeHours,
          storeTimezone,
          maxTimestamp,
          "day"
        );
        const lastWeek = calcUptime(
          storeStatuses,
          storeHours,
          storeTimezone,
          maxTimestamp,
          "week"
        );

        results.push({
          store_id: storeId,
          uptime_last_hour: lastHour.uptimeMinutes,
          downtime_last_hour: lastHour.downtimeMinutes,
          uptime_last_day: lastDay.uptimeHours,
          downtime_last_day: lastDay.downtimeHours,
          uptime_last_week: lastWeek.uptimeHours,
          downtime_last_week: lastWeek.downtimeHours,
        });
      }

      // 5. Save results as CSV
      const filePath = `./src/reports/${reportId}.csv`;
      await saveAsCSV(results, filePath);

      // 6. Update Report status
      await Report.updateOne(
        { report_id: reportId },
        { status: "Complete", file_path: filePath }
      );

    } catch (err) {
      console.error("Error generating report:", err);
      await Report.updateOne(
        { report_id: reportId },
        { status: "Error" }
      );
    }
  }, 100);

  return reportId;
};

/**
 * Get report status or CSV path
 */
export const getReport = async (reportId) => {
  const report = await Report.findOne({ report_id: reportId });

  if (!report) {
    throw new Error("Report not found");
  }

  return report;
};
