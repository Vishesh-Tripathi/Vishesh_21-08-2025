import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  report_id: String,
  status: { type: String, enum: ["Running", "Complete"], default: "Running" },
  file_path: String,
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model("Report", reportSchema);
