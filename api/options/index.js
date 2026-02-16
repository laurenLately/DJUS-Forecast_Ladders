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
      waitMs: Number(process.env.DATABRICKS_WAIT_MS || 20000)
    });

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: result
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
