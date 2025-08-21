import mongoose from "mongoose";

const storeStatusSchema = new mongoose.Schema({
  store_id: String,
  timestamp_utc: Date,
  status: { type: String, enum: ["active", "inactive"] }
});

export default mongoose.model("StoreStatus", storeStatusSchema);
