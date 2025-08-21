import mongoose from "mongoose";

const timezoneSchema = new mongoose.Schema({
  store_id: String,
  timezone_str: { type: String, default: "America/Chicago" }
});

export default mongoose.model("StoreTimezone", timezoneSchema);
