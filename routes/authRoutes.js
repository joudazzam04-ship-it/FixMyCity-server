import express from "express";
import db from "../db/db.js";

const router = express.Router();



// POST /api/auth/signup
// body: { name, email, password, phone }
router.post("/signup", async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  try {
    const exists = await db.query("SELECT id FROM users WHERE email = $1", [email]);

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const result = await db.query(
      `INSERT INTO users (name, email, password, phone, role)
       VALUES ($1, $2, $3, $4, 'citizen')
       RETURNING id, name, email, phone, role, status, joined_on, department_id`,
      [name, email, password, phone]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to create account" });
  }
});

// POST /api/auth/login
// body: { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.joined_on,
              u.department_id, d.name AS department
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = $1 AND u.password = $2`,
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    if (user.status === "Inactive") {
      return res.status(403).json({ message: "This account has been deactivated" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;