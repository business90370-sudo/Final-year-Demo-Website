const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Admin emails
const ADMIN_EMAILS = ["admin@gmail.com"];

// TiDB Cloud Serverless connection pool - with SSL
const dbPool = mysql.createPool({
  host: process.env.DB_HOST || "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  user: process.env.DB_USER || "2YA1xzBAUhuLRA5.root",
  password: process.env.DB_PASSWORD || "aGneQCjq5fmz0UTq",
  database: process.env.DB_NAME || "quickloan",
  port: process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

app.get("/", (req, res) => {
  res.send("Backend running ✅");
});

// REGISTER
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email & password required" });
  }

  const bcrypt = require("bcryptjs");
  const hashed = bcrypt.hashSync(password, 10);

  try {
    const [result] = await dbPool.execute(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name || "", email, hashed]
    );
    res.json({ message: "Registered ✅" });
  } catch (err) {
    res.status(500).json({ message: "User already exists / error" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const bcrypt = require("bcryptjs");

  try {
    const [rows] = await dbPool.execute("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid login" });
    }

    const user = rows[0];
    const ok = bcrypt.compareSync(password, user.password);

    if (!ok) return res.status(401).json({ message: "Wrong password" });

    const isAdmin = ADMIN_EMAILS.includes(user.email);

    return res.json({
      message: "Login success ✅",
      isAdmin,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// FORGOT PASSWORD
app.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;
  const bcrypt = require("bcryptjs");

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email & new password required" });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);

  try {
    const [result] = await dbPool.execute("UPDATE users SET password=? WHERE email=?", [hashed, email]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Email not found" });
    res.json({ message: "Password updated ✅" });
  } catch (err) {
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
    await dbPool.execute(
      "INSERT INTO applications (borrower_name, loan_type, loan_amount, phone, address) VALUES (?, ?, ?, ?, ?)",
      [borrowerName, loanType, loanAmount, phone, address]
    );
    res.json({ message: "Application saved ✅" });
  } catch (err) {
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
    const [rows] = await dbPool.execute("SELECT id, name, email FROM users");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error" });
  }
});

// Safe SQLi *check* (not a "strong attack")
const ALLOWED_HOSTS = [
  "cyberscan-project-4b656.web.app",
  "cyberscan-project-4b656.firebaseapp.com",
];

const axios = require("axios");

app.get("/ping", (req, res) => res.json({ ok: true, msg: "Functions backend working ✅" }));

app.post("/scan/sql", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ ok: false, msg: "Missing url" });

    const u = new URL(url);
    if (!ALLOWED_HOSTS.includes(u.hostname)) {
      return res.json({ ok: false, msg: "Blocked: target not allowed", allowed: ALLOWED_HOSTS });
    }

    // Baseline request
    const baseRes = await axios.get(url, { timeout: 8000, validateStatus: () => true });

    const payloads = [
      "'",
      "\"",
      "' OR '1'='1 -- ",
      "\" OR \"1\"=\"1\" -- ",
      "' UNION SELECT NULL -- ",
      "' AND SLEEP(2) -- "
    ];

    const errorHints = [
      /SQL syntax/i,
      /You have an error in your SQL/i,
      /mysql_/i,
      /Warning: mysql/i,
      /ORA-\d+/i,
      /postgresql/i,
      /sqlite/i
    ];

    const results = [];
    let suspicious = false;

    for (const p of payloads) {
      const testUrl = url + (url.includes("?") ? "&" : "?") + "id=" + encodeURIComponent(p);

      const t0 = Date.now();
      const r = await axios.get(testUrl, { timeout: 8000, validateStatus: () => true });
      const ms = Date.now() - t0;
      const body = String(r.data || "");

      const hasErrorText = errorHints.some(rx => rx.test(body));
      const is5xx = r.status >= 500;
      const timeSlow = ms > 2500;

      if (hasErrorText || is5xx || timeSlow) suspicious = true;

      results.push({
        payload: p,
        status: r.status,
        ms,
        finding: hasErrorText ? "SQL error text" : is5xx ? "Server 5xx" : timeSlow ? "Slow response" : "No obvious issue"
      });
    }

    res.json({
      ok: true,
      target: url,
      suspicious,
      results,
      precautions: [
        "Use prepared statements / parameterized queries.",
        "Validate inputs (allowlist, type checks).",
        "Do not show SQL errors to users.",
        "Least-privilege DB user.",
        "Rate limit + WAF rules."
      ]
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ ok: false, msg: "Server error", error: String(err) });
  }
});

exports.api = functions.https.onRequest(app);
