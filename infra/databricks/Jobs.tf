resource "databricks_job" "refresh_ladder_stage" {
  name = "refresh-ladder-stage"

  max_concurrent_runs = 1

  task {
    task_key = "placeholder"

    # Minimal noop task so the job exists
    notebook_task {
      notebook_path = "/Shared/placeholder"
    }

    # Use an existing interactive cluster for now
    # (we will tighten this in a later phase)
    existing_cluster_id = var.existing_cluster_id
  }
}
