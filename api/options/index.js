const { runJobAndGetJson } = require("../shared/databricks");

// Action name sent to the notebook's action widget.
const ACTION = process.env.DATABRICKS_ACTION_OPTIONS || "options_get";

// Optional dedicated job ID for a serverless cluster (falls back to shared job).
const OPTIONS_JOB_ID = process.env.DATABRICKS_OPTIONS_JOB_ID || undefined;

module.exports = async function (context, req) {
  try {
    const params = {
      retailer: req.query.retailer || req.body?.retailer || "",
      category: req.query.category || req.body?.category || "",
    };

    const result = await runJobAndGetJson(ACTION, params, {
      jobId: OPTIONS_JOB_ID,
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
