const { runJobAndGetJson } = require("../shared/databricks");

// Default action names expected by your Databricks notebook.
// You can override these in SWA env vars without changing code.
const ACTION_LADDER = process.env.DATABRICKS_ACTION_LADDER || "ladder";
const ACTION_CELL = process.env.DATABRICKS_ACTION_CELL || "cell";
const ACTION_OPTIONS = process.env.DATABRICKS_ACTION_OPTIONS || "options";
const ACTION_METRIC_ORDER = process.env.DATABRICKS_ACTION_METRIC_ORDER || "metricOrder";

// Azure Functions gives you route params via context.bindingData.
// With route "ladder/{*path}", the remainder will be in bindingData.path.
function getSubPath(context) {
  const p = context?.bindingData?.path;
  if (!p) return "";
  return String(p).replace(/^\/+/, "").toLowerCase();
}

module.exports = async function (context, req) {
  try {
    const sub = getSubPath(context); // "", "cell", "metricorder", ...

    // Combine query + body into a single parameter bag to forward to Databricks.
    const params = {
      ...(req.query || {}),
      ...(req.body || {}),
    };

    let action = ACTION_LADDER;
    if (sub === "cell") action = ACTION_CELL;
    if (sub === "options") action = ACTION_OPTIONS;
    if (sub === "metricorder" || sub === "metric-order") action = ACTION_METRIC_ORDER;

    const result = await runJobAndGetJson(action, params, {
      waitSeconds: parseInt(process.env.DATABRICKS_WAIT_SECONDS || "25", 10),
    });

    // If the job is still running, return 202 with the run id so the UI can poll.
    if (result && result.__run_id && result.__state && result.__state !== "TERMINATED") {
      context.res = {
        status: 202,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result ?? {}),
    };
  } catch (err) {
    context.log(err);
    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
    };
  }
};
