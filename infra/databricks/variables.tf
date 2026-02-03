variable "resource_group_name" {
  type        = string
  description = "Resource group containing Databricks networking resources"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, test, prod)"
}

variable "public_subnet_id" {
  type        = string
  description = "Public subnet ID for Databricks"
}

variable "private_subnet_id" {
  type        = string
  description = "Private subnet ID for Databricks"
}
