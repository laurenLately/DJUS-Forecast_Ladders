const { runJobAndGetJson } = require("../shared/databricks");

module.exports = async function (context, req) {
  // Basic health check — always returns 200.
  // With ?warm=true, also fires a lightweight "ping" action on the main
  // Databricks cluster so it starts warming before the user needs it.
  const warm = (req.query.warm || "").toLowerCase() === "true";

  if (!warm) {
    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { ok: true, service: "dj-forecast-ladders-api" },
    };
    return;
  }

  try {
    const result = await runJobAndGetJson("ping", {}, {
      waitSeconds: Number(process.env.DATABRICKS_WAIT_SECONDS || 25),
    });

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        service: "dj-forecast-ladders-api",
        cluster: "warm",
        ping: result,
      }),
    };
  } catch (err) {
    // Even if the ping fails, the cluster may have started waking.
    // Return 200 so the UI treats it as a best-effort warm-up.
    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        service: "dj-forecast-ladders-api",
        cluster: "warming",
        error: err?.message,
      }),
    };
  }
};
