import express from "express";
import multer from "multer";
import { 
  ingestStoreStatus, 
  ingestBusinessHours, 
  ingestStoreTimezone 
} from "../controllers/dataIngestController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/store-status", upload.single("file"), ingestStoreStatus);
router.post("/business-hours", upload.single("file"), ingestBusinessHours);
router.post("/store-timezone", upload.single("file"), ingestStoreTimezone);

export default router;
