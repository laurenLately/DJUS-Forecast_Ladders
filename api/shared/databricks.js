// api/shared/databricks.js
const axios = require("axios");
 
function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
 
function databricksClient() {
  const host = requiredEnv("DATABRICKS_HOST").replace(/\/$/, "");
  const token = requiredEnv("DATABRICKS_TOKEN");
  return axios.create({
    baseURL: `${host}/api/2.1`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    timeout: Number(process.env.DATABRICKS_HTTP_TIMEOUT_MS || 20000),
  });
}
 
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
 
/**
 * Runs a Databricks Job and waits (briefly) for completion.
 * If it doesn't finish within waitSeconds, returns { __state: 'RUNNING', __run_id }.
 */
async function runJobAndGetResult({
  jobId,
  notebookParams = {},
  waitSeconds = Number(process.env.DATABRICKS_WAIT_SECONDS || 20),
}) {
  const client = databricksClient();
 
  const { data: runNow } = await client.post("/jobs/run-now", {
    job_id: Number(jobId),
    notebook_params: notebookParams,
  });
 
  const runId = runNow.run_id;
  const deadline = Date.now() + waitSeconds * 1000;
 
  while (Date.now() < deadline) {
    const { data: run } = await client.get("/jobs/runs/get", {
      params: { run_id: runId },
    });
 
    const state = run?.state;
    if (
      state?.life_cycle_state === "TERMINATED" ||
      state?.life_cycle_state === "INTERNAL_ERROR"
    ) {
      const { data: out } = await client.get("/jobs/runs/get-output", {
        params: { run_id: runId },
      });
 
      const notebookOutput = out?.notebook_output?.result;
 
      if (state?.result_state !== "SUCCESS") {
        const msg =
          out?.error ||
          out?.state_message ||
          state?.state_message ||
          "Databricks run failed.";
        const err = new Error(msg);
        err.databricks = { runId, state, output: notebookOutput };
        throw err;
      }
 
      let parsed = notebookOutput;
      if (typeof notebookOutput === "string") {
        try {
          parsed = JSON.parse(notebookOutput);
        } catch {
          /* keep raw */
        }
      }
 
      return { status: "SUCCESS", runId, result: parsed };
    }
 
    await sleep(800);
  }
 
  return { status: "RUNNING", runId };
}
 
/**
 * What your ladder router expects:
 *   runJobAndGetJson(action, params, {waitSeconds})
 *
 * This wrapper:
 * - pulls the Databricks job id from env
 * - injects `action` into notebook_params as `action`
 * - returns the notebook JSON directly (or a RUNNING payload you can poll)
 */
async function runJobAndGetJson(action, params = {}, opts = {}) {
  const jobId =
    opts.jobId ||
    process.env.DATABRICKS_JOB_ID ||
    process.env.DATABRICKS_LADDER_JOB_ID ||
    process.env.DATABRICKS_ROUTER_JOB_ID;

  if (!jobId) {
    throw new Error(
      "Missing Databricks job id env var. Set DATABRICKS_JOB_ID (recommended)."
    );
  }
 
  const waitSeconds =
    typeof opts.waitSeconds === "number"
      ? opts.waitSeconds
      : Number(process.env.DATABRICKS_WAIT_SECONDS || 20);
 
  const r = await runJobAndGetResult({
    jobId,
    notebookParams: { action, ...(params || {}) },
    waitSeconds,
  });
 
  if (r.status === "RUNNING") {
    return { __state: "RUNNING", __run_id: r.runId };
  }
 
  // success: return the notebook's parsed JSON result (or raw string)
  return r.result;
}
 
module.exports = {
  runJobAndGetResult,
  runJobAndGetJson,
};
 
