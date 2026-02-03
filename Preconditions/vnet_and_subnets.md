# VNet and Subnet Preconditions

## Virtual Network
- VNet name:
- Address space:

## Subnets (REQUIRED)

### Public Subnet
- Name:
- Address range:
- Delegated to: Microsoft.Databricks/workspaces
- NSG attached: Yes / No

### Private Subnet
- Name:
- Address range:
- Delegated to: Microsoft.Databricks/workspaces
- NSG attached: Yes / No

## Network Rules
- Outbound traffic must route through NAT Gateway
- No public IPs on Databricks clusters
- Egress IP must be static


