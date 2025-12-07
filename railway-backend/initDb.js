const fs = require("fs");
const path = require("path");
const { query } = require("./db");

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, "sql", "initial_schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");
    await query(sql);
    console.log("[db] schema ensured");
  } catch (error) {
    console.error("[db] Failed to initialize schema:", error.message);
    throw error;
  }
}

module.exports = { initDb };
