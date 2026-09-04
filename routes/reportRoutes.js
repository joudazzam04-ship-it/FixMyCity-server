import express from "express";
import { requireRole } from "../middleware/roleAuth.js";

import {getAllReports,getReportById,createReport,assignReport,updateReportStatus,rejectReport,
  addNote,deleteReport, addReportImage} from "../controllers/reportController.js";
  

const router = express.Router();

router.get("/", getAllReports);
router.get("/:id", getReportById);

router.post("/", requireRole("citizen"), createReport);

router.put("/:id/assign", requireRole("admin"), assignReport);
router.put("/:id/reject", requireRole("admin"), rejectReport);

router.put("/:id/status", requireRole("employee"), updateReportStatus);
router.post("/:id/notes", requireRole("employee"), addNote);

router.delete("/:id", requireRole("citizen"), deleteReport);
router.post("/:id/images", requireRole("employee"), addReportImage);

export default router;