require("dotenv").config();
const mysql = require("mysql2");

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
  if (err) {
    console.log("❌ DB Connection Error:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to TiDB Cloud");

  // Create users table
  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create applications table
  const createApplications = `
    CREATE TABLE IF NOT EXISTS applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      borrower_name VARCHAR(255) NOT NULL,
      loan_type VARCHAR(100) NOT NULL,
      loan_amount DECIMAL(10,2) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createUsers, (err) => {
    if (err) console.log("❌ Error creating users table:", err.message);
    else console.log("✅ Users table ready");
  });

  db.query(createApplications, (err) => {
    if (err) console.log("❌ Error creating applications table:", err.message);
    else console.log("✅ Applications table ready");
  });

  // Check existing users
  db.query("SELECT COUNT(*) as count FROM users", (err, result) => {
    if (err) console.log("❌ Error checking users:", err.message);
    else console.log(`📊 Total users in database: ${result[0].count}`);
    process.exit(0);
  });
});
