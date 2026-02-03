output "databricks_nat_public_ip" {
  description = "Outbound IP address for Databricks (Snowflake allowlist)"
  value       = azurerm_public_ip.databricks_nat.ip_address
}

output "databricks_nat_gateway_id" {
  description = "NAT Gateway ID"
  value       = azurerm_nat_gateway.databricks.id
}
