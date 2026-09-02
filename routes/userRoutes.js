import express from "express";
import {getAllUsers, getEmployeesByDepartment, updateUserStatus} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/employees/department/:departmentId", getEmployeesByDepartment);
router.put("/:id/status", updateUserStatus);

export default router;