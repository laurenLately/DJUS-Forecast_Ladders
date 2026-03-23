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

# Lightweight job for options/item lookup — runs on serverless for instant cold starts
resource "databricks_job" "ladder_options_serverless" {
  name = "ladder-options-serverless"

  max_concurrent_runs = 5

  task {
    task_key = "options"

    notebook_task {
      notebook_path = var.ladder_notebook_path
    }

    # Serverless — no cluster needed, spins up in seconds
    new_cluster {
      num_workers   = 0
      spark_version = "auto-latest"

      custom_tags = {
        Purpose = "ladder-options-api"
      }
    }
  }
}
