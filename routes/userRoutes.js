import express from "express";
import { requireRole } from "../middleware/roleAuth.js";

import {
  getAllUsers,
  getEmployeesByDepartment,
  updateUserStatus,
  createEmployee
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", requireRole("admin"), getAllUsers);

router.get(
  "/employees/department/:departmentId",
  requireRole("admin"),
  getEmployeesByDepartment
);

router.put("/:id/status", requireRole("admin"), updateUserStatus);

router.post("/employees", requireRole("admin"), createEmployee);

export default router;