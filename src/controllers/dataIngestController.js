import csvParser from "csv-parser";
import fs from "fs";
import StoreStatus from "../models/StoreStatus.js";
import BusinessHours from "../models/BusinessHours.js";
import StoreTimezone from "../models/StoreTimezone.js";

/**
 * Ingest Store Status CSV
 * Expected columns: store_id, status, timestamp_utc
 */
export const ingestStoreStatus = async (req, res) => {
  try {
    const results = [];

    fs.createReadStream(req.file.path) // file uploaded by multer
      .pipe(csvParser())
      .on("data", (row) => {
        results.push({
          store_id: row.store_id,
          status: row.status,
          timestamp_utc: new Date(row.timestamp_utc),
        });
      })
      .on("end", async () => {
        await StoreStatus.insertMany(results);
        res.status(200).json({ message: "Store status ingested successfully" });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ingest Business Hours CSV
 * Expected columns: store_id, dayOfWeek, start_time_local, end_time_local
 */
export const ingestBusinessHours = async (req, res) => {
  try {
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on("data", (row) => {
        results.push({
          store_id: row.store_id,
          dayOfWeek: parseInt(row.dayOfWeek),
          start_time_local: row.start_time_local,
          end_time_local: row.end_time_local,
        });
      })
      .on("end", async () => {
        await BusinessHours.insertMany(results);
        res.status(200).json({ message: "Business hours ingested successfully" });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Ingest Store Timezone CSV
 * Expected columns: store_id, timezone
 */
export const ingestStoreTimezone = async (req, res) => {
  try {
    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csvParser())
      .on("data", (row) => {
        results.push({
          store_id: row.store_id,
          timezone: row.timezone,
        });
      })
      .on("end", async () => {
        await StoreTimezone.insertMany(results);
        res.status(200).json({ message: "Store timezone ingested successfully" });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
