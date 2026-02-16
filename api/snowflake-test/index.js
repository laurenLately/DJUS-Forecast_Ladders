const { runJobAndGetJson } = require("../shared/databricks");

const ACTION_TEST = process.env.DATABRICKS_ACTION_SNOWFLAKE_TEST || "snowflake_test";

module.exports = async function (context, req) {
  try {
    const payload = await runJobAndGetJson({
      action: ACTION_TEST,
      params: {},
      maxWaitMs: 20000,
    });
    context.res = { status: 200, headers: { "content-type": "application/json" }, body: { ok: true, ...payload } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, headers: { "content-type": "application/json" }, body: { ok: false, error: String(err?.message || err) } };
  }
};
