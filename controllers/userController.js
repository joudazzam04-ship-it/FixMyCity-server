import db from "../db/db.js";

export const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.role,
         u.status,
         u.joined_on,
         u.department_id,
         d.name AS department
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.id ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const getEmployeesByDepartment = async (req, res) => {
  const { departmentId } = req.params;

  try {
    const result = await db.query(
      `SELECT id, name, email, department_id
       FROM users
       WHERE role = 'employee'
         AND department_id = $1
         AND status = 'Active'
       ORDER BY name ASC`,
      [departmentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== "Active" && status !== "Inactive") {
    return res.status(400).json({
      message: "Status must be Active or Inactive"
    });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET status = $1
       WHERE id = $2
       RETURNING id, name, email, role, status`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
};

export const createEmployee = async (req, res) => {
  const { name, email, password, phone, department_id } = req.body;

  if (!name || !email || !password || !department_id) {
    return res.status(400).json({
      message: "Name, email, password and department are required"
    });
  }

  try {
    const exists = await db.query("SELECT id FROM users WHERE email = $1", [email]);

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password, phone, role, department_id)
       VALUES ($1, $2, $3, $4, 'employee', $5)
       RETURNING id, name, email, phone, role, status, joined_on, department_id`,
      [name, email, password, phone, department_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating employee:", error);
    res.status(500).json({ message: "Failed to create employee" });
  }
};