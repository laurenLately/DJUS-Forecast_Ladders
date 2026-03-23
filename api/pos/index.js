const { runJobAndGetJson } = require("../shared/databricks");

const ACTION = process.env.DATABRICKS_ACTION_POS || "pos_read";

module.exports = async function (context, req) {
  try {
    const params = {
      retailer: req.query.retailer || "",
      retailer_item_id: req.query.retailer_item_id || "",
      week_ending_from: req.query.week_ending_from || "",
      week_ending_to: req.query.week_ending_to || "",
    };

    const result = await runJobAndGetJson(ACTION, params, {
      waitSeconds: Number(process.env.DATABRICKS_WAIT_SECONDS || 25),
    });

    // If the job is still running, return 202 so the UI can poll.
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
    context.log.error("pos error", {
      message: err?.message,
      stack: err?.stack,
    });

    context.res = {
      status: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: err?.message || "Internal server error",
      }),
    };
  }
};
