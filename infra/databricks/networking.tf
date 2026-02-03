# ------------------------------------------------------------
# Phase 1: Databricks Networking (Outbound Control)
# ------------------------------------------------------------

# Static Public IP for Snowflake Allowlist
resource "azurerm_public_ip" "databricks_nat" {
  name                = "dj-ladders-databricks-nat-ip"
  resource_group_name = var.resource_group_name
  location            = var.location

  allocation_method = "Static"
  sku               = "Standard"

  tags = {
    environment = var.environment
    application = "dj-forecast-ladders"
  }
}

# NAT Gateway
resource "azurerm_nat_gateway" "databricks" {
  name                = "dj-ladders-databricks-nat-gateway"
  resource_group_name = var.resource_group_name
  location            = var.location

  sku_name = "Standard"

  tags = {
    environment = var.environment
    application = "dj-forecast-ladders"
  }
}

# Associate Public IP with NAT Gateway
resource "azurerm_nat_gateway_public_ip_association" "databricks" {
  nat_gateway_id       = azurerm_nat_gateway.databricks.id
  public_ip_address_id = azurerm_public_ip.databricks_nat.id
}

# Attach NAT Gateway to Databricks Subnets
resource "azurerm_subnet_nat_gateway_association" "public" {
  subnet_id      = var.public_subnet_id
  nat_gateway_id = azurerm_nat_gateway.databricks.id
}

resource "azurerm_subnet_nat_gateway_association" "private" {
  subnet_id      = var.private_subnet_id
  nat_gateway_id = azurerm_nat_gateway.databricks.id
}
