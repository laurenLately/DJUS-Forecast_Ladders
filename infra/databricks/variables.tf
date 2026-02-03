variable "databricks_host" {
  type        = string
  description = "Databricks workspace URL (e.g. https://adb-xxxx.azuredatabricks.net)"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, test, prod)"
}
