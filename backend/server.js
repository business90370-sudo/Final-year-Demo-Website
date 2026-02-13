require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();
app.use(cors());
app.use(express.json());

// Admin emails
const ADMIN_EMAILS = ["admin@gmail.com"];

// DB connection (TiDB Cloud Serverless) - with SSL
const db = mysql.createConnection({
  host: process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  user: process.env.DB_USER || "2YA1xzBAUhuLRA5.root",
  password: process.env.DB_PASSWORD || "aGneQCjq5fmz0UTq",
  database: process.env.DB_NAME || "quickloan",
  port: process.env.DB_PORT || 4000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

db.connect((err) => {
  if (err) return console.log("DB Error:", err.message);
  console.log("TiDB Cloud Connected ✅");
});

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// REGISTER
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email & password required" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [name || "", email, hashed], (err) => {
    if (err) {
      console.log("Registration Error:", err.message); // Debug log
      return res.status(500).json({ message: "Error: " + err.message });
    }
    res.json({ message: "Registered ✅" });
  });
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err || result.length === 0) {
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
  });
});

// FORGOT PASSWORD
app.post("/forgot-password", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email & new password required" });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);

  db.query("UPDATE users SET password=? WHERE email=?", [hashed, email], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Email not found" });

    res.json({ message: "Password updated ✅" });
  });
});

// APPLY (save application)
app.post("/apply", (req, res) => {
  const { borrowerName, loanType, loanAmount, phone, address } = req.body;

  if (!borrowerName || !loanType || !loanAmount || !phone || !address) {
    return res.status(400).json({ message: "Fill all fields" });
  }

  const sql =
    "INSERT INTO applications (borrower_name, loan_type, loan_amount, phone, address) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [borrowerName, loanType, loanAmount, phone, address], (err) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json({ message: "Application saved ✅" });
  });
});

// ADMIN: show all users
app.get("/admin/users", (req, res) => {
  const adminEmail = req.headers["x-admin-email"];

  if (!ADMIN_EMAILS.includes(adminEmail)) {
    return res.status(403).json({ message: "Admin only" });
  }

  db.query("SELECT id, name, email FROM users", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});

// ✅ only ONE listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
