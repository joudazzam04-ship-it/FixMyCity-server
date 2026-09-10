import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

db.on("error", (err) => console.error("Database error:", err));

export default db;