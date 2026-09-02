import express from "express";
import { getAllReports, getReportById,createReport, assignReport, updateReportStatus,rejectReport, addNote  } from "../controllers/reportController.js";


const router = express.Router();

router.get("/", getAllReports);
router.get("/:id", getReportById);
router.post("/", createReport);
router.put("/:id/assign", assignReport);
router.put("/:id/status", updateReportStatus);
router.put("/:id/reject", rejectReport);
router.post("/:id/notes", addNote);

export default router;