# Snowflake Account Access Preconditions

## Snowflake Account
- Account locator:
- Region:
- Cloud provider: Azure

## Databricks Trust Model
Snowflake will only allow inbound connections from:
- Databricks NAT Gateway public IP(s)

No other inbound access is permitted.

## Required Snowflake Privileges
The Snowflake administrator must be able to:
- Create network policies
- Create roles
- Create schemas and tables
- Grant privileges to service roles

## Information Required for Later Phases
- Databricks outbound IP(s): TBD (from Phase 1)
- Snowflake role naming convention


