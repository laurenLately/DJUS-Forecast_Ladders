const { runJobAndGetJson } = require("../shared/databricks");

// Your Databricks notebook should interpret an "action" parameter.
// Default is "options" but you can override per environment.
const ACTION = process.env.DATABRICKS_ACTION_OPTIONS || "options";

module.exports = async function (context, req) {
  try {
    // Pass through any filters your notebook supports.
    const params = {
      type: req.query.type || req.body?.type || "options",
      retailer: req.query.retailer || req.body?.retailer || "",
      category: req.query.category || req.body?.category || ""
    };

    const result = await runJobAndGetJson(ACTION, params, {
      waitSeconds: Number(process.env.DATABRICKS_WAIT_SECONDS || 25),
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
      body: result,
    };
  } catch (err) {
    context.log.error("options error", {
      message: err?.message,
      stack: err?.stack
    });

    context.res = {
      status: 500,
      body: { error: err?.message || "Internal server error" }
    };
  }
};
