variable "databricks_host" {
  type        = string
  description = "Databricks workspace URL (e.g. https://adb-xxxx.azuredatabricks.net)"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, test, prod)"
}
variable "existing_cluster_id" {
  type        = string
  description = "Existing Databricks cluster ID used for placeholder jobs"
}

variable "ladder_notebook_path" {
  type        = string
  description = "Workspace path to the ladder_api_router notebook"
  default     = "/Shared/ladder_api_router"
}
