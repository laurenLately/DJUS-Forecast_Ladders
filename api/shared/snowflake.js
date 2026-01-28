const snowflake = require("snowflake-sdk");

function getEnv(name, required = true) {
  const v = process.env[name];
  if (required && (!v || String(v).trim() === "")) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function createConnection() {
  return snowflake.createConnection({
    account: getEnv("SNOWFLAKE_ACCOUNT"),
    username: getEnv("SNOWFLAKE_USERNAME"),
    password: getEnv("SNOWFLAKE_PASSWORD"),
    warehouse: getEnv("SNOWFLAKE_WAREHOUSE"),
    database: getEnv("SNOWFLAKE_DATABASE"),
    schema: getEnv("SNOWFLAKE_SCHEMA"),
    role: getEnv("SNOWFLAKE_ROLE", false) || undefined
  });
}

function connect(conn) {
  return new Promise((resolve, reject) => {
    conn.connect((err, connection) => {
      if (err) reject(err);
      else resolve(connection);
    });
  });
}

function execute(conn, sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    });
  });
}

function destroy(conn) {
  return new Promise((resolve) => {
    try {
      conn.destroy(() => resolve());
    } catch {
      resolve();
    }
  });
}

async function querySnowflake(sqlText, binds = []) {
  const conn = createConnection();
  try {
    await connect(conn);
    const rows = await execute(conn, sqlText, binds);
    return rows;
  } finally {
    await destroy(conn);
  }
}

module.exports = { querySnowflake };
