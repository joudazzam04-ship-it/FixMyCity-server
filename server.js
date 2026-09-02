import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import db from "./db/db.js";
import reportRoutes from "./routes/reportRoutes.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);


app.get("/", (req, res) => {
  res.json({ message: "FixMyCity API is running" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({ message: "Database connected", time: result.rows[0].now });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});