const { querySnowflake } = require("../shared/snowflake");

module.exports = async function (context, req) {
  try {
    const rows = await querySnowflake("select current_account() as account, current_role() as role, current_warehouse() as wh");
    context.res = { status: 200, headers: { "content-type": "application/json" }, body: { ok: true, rows } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, headers: { "content-type": "application/json" }, body: { ok: false, error: String(err?.message || err) } };
  }
};
