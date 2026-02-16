// api/shared/databricks.js
// Helper for Azure Static Web App (Functions) to call Databricks Jobs API.
// Assumes your Databricks Job runs a notebook that ends with dbutils.notebook.exit(<json string>). 

const axios = require('axios');

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function databricksClient() {
  const host = requiredEnv('DATABRICKS_HOST').replace(/\/$/, '');
  const token = requiredEnv('DATABRICKS_TOKEN');

  return axios.create({
    baseURL: `${host}/api/2.1`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: Number(process.env.DATABRICKS_HTTP_TIMEOUT_MS || 20000)
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Runs a Databricks Job and waits (briefly) for completion.
 * If the run does not finish within waitSeconds, returns { status: 'RUNNING', runId }.
 */
async function runJobAndGetResult({
  jobId,
  notebookParams = {},
  waitSeconds = Number(process.env.DATABRICKS_WAIT_SECONDS || 20)
}) {
  const client = databricksClient();

  const { data: runNow } = await client.post('/jobs/run-now', {
    job_id: Number(jobId),
    notebook_params: notebookParams
  });

  const runId = runNow.run_id;
  const deadline = Date.now() + waitSeconds * 1000;

  // Poll run state
  while (Date.now() < deadline) {
    const { data: run } = await client.get('/jobs/runs/get', { params: { run_id: runId } });
    const state = run?.state;
    if (state?.life_cycle_state === 'TERMINATED' || state?.life_cycle_state === 'INTERNAL_ERROR') {
      // Fetch notebook output (may contain error)
      const { data: out } = await client.get('/jobs/runs/get-output', { params: { run_id: runId } });
      const notebookOutput = out?.notebook_output?.result;

      if (state?.result_state !== 'SUCCESS') {
        const msg = out?.error || out?.state_message || state?.state_message || 'Databricks run failed.';
        const err = new Error(msg);
        err.databricks = { runId, state, output: notebookOutput };
        throw err;
      }

      // The notebook should return a JSON string. Fall back to raw.
      let parsed = notebookOutput;
      if (typeof notebookOutput === 'string') {
        try { parsed = JSON.parse(notebookOutput); } catch { /* keep raw */ }
      }

      return { status: 'SUCCESS', runId, result: parsed };
    }

    // Short backoff
    await sleep(800);
  }

  return { status: 'RUNNING', runId };
}

module.exports = {
  runJobAndGetResult
};
