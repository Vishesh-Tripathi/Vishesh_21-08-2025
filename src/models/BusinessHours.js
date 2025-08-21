import mongoose from "mongoose";

const businessHoursSchema = new mongoose.Schema({
  store_id: String,
  dayOfWeek: Number,
  start_time_local: String,
  end_time_local: String
});

export default mongoose.model("BusinessHours", businessHoursSchema);
