resource "databricks_job" "refresh_ladder_stage" {
  name = "refresh-ladder-stage"

  max_concurrent_runs = 1

  schedule {
    quartz_cron_expression = "0 0 2 * * ?"
    timezone_id            = "UTC"
  }

  task {
    task_key = "refresh_snowflake_stage"

    python_task {
      python_file = "dbfs:/jobs/refresh_ladder_stage.py"
    }

    new_cluster {
      spark_version = "13.3.x-scala2.12"
      node_type_id  = "Standard_DS3_v2"
      num_workers   = 2

      autotermination_minutes = 30

      custom_tags = {
        environment = var.environment
        workload    = "snowflake-refresh"
      }
    }
  }

  tags = {
    environment = var.environment
    application = "dj-forecast-ladders"
    job_type    = "staging-refresh"
  }
}
