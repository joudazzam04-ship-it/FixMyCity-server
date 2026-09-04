import express from "express";
import { getAllDepartments, getAllCategories } from "../controllers/lookupController.js";

const router = express.Router();

router.get("/departments", getAllDepartments);
router.get("/categories", getAllCategories);

export default router;