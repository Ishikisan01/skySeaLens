#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/srv/skysealens"
CURRENT_LINK="$BASE_DIR/current"
PREVIOUS_LINK="$BASE_DIR/previous"

if [[ ! -L "$PREVIOUS_LINK" ]]; then
  echo "No previous release symlink found."
  exit 1
fi

ln -sfn "$(readlink -f "$PREVIOUS_LINK")" "$CURRENT_LINK"
systemctl restart skysealens-api.service
systemctl restart skysealens-ingest.service

echo "Rollback completed to $(readlink -f "$CURRENT_LINK")"
