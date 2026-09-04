import db from "../db/db.js";

export const getAllDepartments = async (req, res) => {
  try {
    const result = await db.query("SELECT id, name FROM departments ORDER BY name ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

export const getAllCategories = async (req, res) => {
  try {
    const result = await db.query("SELECT id, name FROM categories ORDER BY name ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};