import mysql from "mysql2/promise";

const requiredEnvironmentVariables = [
  "MYSQL_HOST",
  "MYSQL_PORT",
  "MYSQL_DATABASE",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
] as const;

for (const variable of requiredEnvironmentVariables) {
  if (!process.env[variable]) {
    throw new Error(
      `Missing required database environment variable: ${variable}`
    );
  }
}

const port = Number(process.env.MYSQL_PORT);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("MYSQL_PORT must be a valid positive integer.");
}

export const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});