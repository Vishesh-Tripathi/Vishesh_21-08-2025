import express from "express";
import { triggerReportController, getReportController } from "../controllers/reportController.js";

const router = express.Router();

router.post("/trigger_report", triggerReportController);
router.get("/get_report/:report_id", getReportController);

export default router;
