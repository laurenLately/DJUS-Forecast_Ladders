#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$HOME/DJUS-Forecast_Ladders}"
TF_DIR="$REPO_ROOT/infra/databricks"

echo "==> cd $TF_DIR"
cd "$TF_DIR"

echo "==> terraform version"
terraform -version

# If a state file exists, back it up BEFORE doing anything
if [[ -f terraform.tfstate ]]; then
  TS="$(date +%Y%m%d_%H%M%S)"
  mkdir -p _state_backups
  cp -v terraform.tfstate "_state_backups/terraform.tfstate.$TS"
  [[ -f terraform.tfstate.backup ]] && cp -v terraform.tfstate.backup "_state_backups/terraform.tfstate.backup.$TS" || true
  echo "==> State backup created in $TF_DIR/_state_backups/"
else
  echo "==> No terraform.tfstate found yet (first run)."
fi

echo "==> terraform init"
terraform init

echo "==> terraform validate"
terraform validate

echo "==> terraform plan (saved)"
terraform plan -out=tfplan

echo
read -r -p "Apply tfplan now? Type YES to confirm: " CONFIRM
if [[ "$CONFIRM" == "YES" ]]; then
  echo "==> terraform apply (from saved plan)"
  terraform apply tfplan
  echo "==> Done."
else
  echo "==> Skipped apply. Plan saved as: $TF_DIR/tfplan"
fi
