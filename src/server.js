import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import reportRoutes from "./routes/reportRoutes.js";
import dataRoutes from "./routes/dataRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/report", reportRoutes);
app.use("/api/data", dataRoutes);

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

app.listen(5000, () => console.log("Server running on port 5000"));
app.use("/api/report", reportRoutes);
app.use("/api/data", dataRoutes);
