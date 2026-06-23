require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const sqlPath = path.join(__dirname, "..", "supabase", "init.sql");

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it in backend/.env, then re-run this script.");
  }

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL bootstrap file not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, "utf8");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  await client.connect();
  try {
    await client.query(sql);
    console.log("Supabase app-data tables initialized successfully.");
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});