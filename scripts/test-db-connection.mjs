import mysql from "mysql2/promise";
import fs from "node:fs";

const envText = fs.readFileSync(".env.local", "utf8");

for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    continue;
  }

  const separator = trimmed.indexOf("=");

  if (separator === -1) {
    continue;
  }

  const key = trimmed.slice(0, separator).trim();
  const value = trimmed.slice(separator + 1).trim();

  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

try {
  const [rows] = await pool.query(
    "SELECT 1 AS connection_test"
  );

  console.log("========================================");
  console.log(" BIZTOOLLAB DATABASE POOL TEST");
  console.log("========================================");
  console.log("[PASS] MySQL connection pool created.");
  console.log("[PASS] Pool SELECT query succeeded.");
  console.log("[RESULT]", rows);
} finally {
  await pool.end();
}