resource "databricks_sql_endpoint" "ladder_ui" {
  name = "ladder-ui-warehouse"

  cluster_size       = "Small"
  max_num_clusters   = 1
  auto_stop_mins     = 10

  enable_serverless_compute = true
  warehouse_type            = "PRO"

  spot_instance_policy = "COST_OPTIMIZED"

  tags = {
    environment = var.environment
    application = "dj-forecast-ladders"
    workload    = "ui-read-write"
  }
}
