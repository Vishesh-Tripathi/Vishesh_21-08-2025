import { triggerReport, getReport } from "../services/reportService.js";

export const triggerReportController = async (req, res) => {
  try {
    const reportId = await triggerReport();
    res.json({ report_id: reportId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getReportController = async (req, res) => {
  try {
    const { report_id } = req.params;
    const reportData = await getReport(report_id);

    if (reportData.status === "Running") {
      res.json({ status: "Running" });
    } else {
      res.download(reportData.file_path);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
