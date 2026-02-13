require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

// Admin emails
const ADMIN_EMAILS = ["admin@gmail.com"];

// Create connection pool for TiDB Cloud Serverless
const pool = mysql.createPool({
  host: process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  user: process.env.DB_USER || "2YA1xzBAUhuLRA5.root",
  password: process.env.DB_PASSWORD || "aGneQCjq5fmz0UTq",
  database: process.env.DB_NAME || "quickloan",
  port: process.env.DB_PORT || 4000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log("TiDB Cloud Connected ✅");
    conn.release();
  })
  .catch(err => console.log("DB Connection Error:", err.message));

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// REGISTER
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email & password required" });
  }

  try {
    const hashed = bcrypt.hashSync(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name || "", email, hashed]
    );
    res.json({ message: "Registered ✅" });
  } catch (err) {
    console.log("Registration Error:", err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(500).json({ message: "User already exists" });
    }
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [result] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid login" });
    }

    const user = result[0];
    const ok = bcrypt.compareSync(password, user.password);

    if (!ok) return res.status(401).json({ message: "Wrong password" });

    const isAdmin = ADMIN_EMAILS.includes(user.email);

    return res.json({
      message: "Login success ✅",
      isAdmin,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.log("Login Error:", err.message);
    res.status(500).json({ message: "Error: " + err.message });
  }
});

// FORGOT PASSWORD
app.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email & new password required" });
  }

  try {
    const hashed = bcrypt.hashSync(newPassword, 10);
    const [result] = await pool.query(
      "UPDATE users SET password=? WHERE email=?",
      [hashed, email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Email not found" });
    }
    res.json({ message: "Password updated ✅" });
  } catch (err) {
    console.log("Forgot Password Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// APPLY (save application)
app.post("/apply", async (req, res) => {
  const { borrowerName, loanType, loanAmount, phone, address } = req.body;

  if (!borrowerName || !loanType || !loanAmount || !phone || !address) {
    return res.status(400).json({ message: "Fill all fields" });
  }

  try {
    await pool.query(
      "INSERT INTO applications (borrower_name, loan_type, loan_amount, phone, address) VALUES (?, ?, ?, ?, ?)",
      [borrowerName, loanType, loanAmount, phone, address]
    );
    res.json({ message: "Application saved ✅" });
  } catch (err) {
    console.log("Apply Error:", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

// ADMIN: show all users
app.get("/admin/users", async (req, res) => {
  const adminEmail = req.headers["x-admin-email"];

  if (!ADMIN_EMAILS.includes(adminEmail)) {
    return res.status(403).json({ message: "Admin only" });
  }

  try {
    const [rows] = await pool.query("SELECT id, name, email FROM users");
    res.json(rows);
  } catch (err) {
    console.log("Admin Error:", err.message);
    res.status(500).json({ message: "DB error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
