import express from "express";
import mongoose from "mongoose";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();
app.use(express.json());

// Routes
app.use("/api", reportRoutes);

mongoose.connect("mongodb://localhost:27017/storeMonitoring")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

app.listen(5000, () => console.log("Server running on port 5000"));
