terraform {
  required_version = ">= 1.3.0"

  required_providers {
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.30"
    }
  }
}



provider "databricks" {
  host = var.databricks_host
}
