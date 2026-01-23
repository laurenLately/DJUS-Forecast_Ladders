const snowflake = require("snowflake-sdk");

function normalizeKey(key) {
  return key?.replace(/\\n/g, "\n");
}

function exec(conn, sql) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      complete: (err, stmt, rows) =>
        err ? reject(err) : resolve(rows)
    });
  });
}

module.exports = async function (context, req) {
  const conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USER,
    privateKey: normalizeKey(process.env.SNOWFLAKE_PRIVATE_KEY),
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    role: process.env.SNOWFLAKE_ROLE
  });

  try {
    await new Promise((resolve, reject) =>
      conn.connect(err => err ? reject(err) : resolve())
    );

    const rows = await exec(conn, `
      select
        current_user() as user,
        current_role() as role,
        current_warehouse() as warehouse,
        current_database() as database
    `);

    context.res = { status: 200, body: rows[0] };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  } finally {
    try { conn.destroy(); } catch {}
  }
};const snowflake = require("snowflake-sdk");

function normalizeKey(key) {
  return key?.replace(/\\n/g, "\n");
}

function exec(conn, sql) {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      complete: (err, stmt, rows) =>
        err ? reject(err) : resolve(rows)
    });
  });
}

module.exports = async function (context, req) {
  const conn = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USER,
    privateKey: normalizeKey(process.env.SNOWFLAKE_PRIVATE_KEY),
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    role: process.env.SNOWFLAKE_ROLE
  });

  try {
    await new Promise((resolve, reject) =>
      conn.connect(err => err ? reject(err) : resolve())
    );

    const rows = await exec(conn, `
      select
        current_user() as user,
        current_role() as role,
        current_warehouse() as warehouse,
        current_database() as database
    `);

    context.res = { status: 200, body: rows[0] };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  } finally {
    try { conn.destroy(); } catch {}
  }
};
