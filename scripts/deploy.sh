#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: deploy.sh <version>"
  exit 1
fi

BASE_DIR="/srv/skysealens"
RELEASE_DIR="$BASE_DIR/releases/$VERSION"
CURRENT_LINK="$BASE_DIR/current"
PREVIOUS_LINK="$BASE_DIR/previous"

mkdir -p "$RELEASE_DIR"
mkdir -p "$BASE_DIR/shared/logs"

tar -xzf "./artifacts/skysealens-web-$VERSION.tar.gz" -C "$RELEASE_DIR"
tar -xzf "./artifacts/skysealens-api-$VERSION.tar.gz" -C "$RELEASE_DIR"
tar -xzf "./artifacts/skysealens-ingest-$VERSION.tar.gz" -C "$RELEASE_DIR"

ln -sfn "$BASE_DIR/shared/.env" "$RELEASE_DIR/.env"
if [[ -L "$CURRENT_LINK" ]]; then
  ln -sfn "$(readlink -f "$CURRENT_LINK")" "$PREVIOUS_LINK"
fi
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

systemctl restart skysealens-api.service
systemctl restart skysealens-ingest.service

sleep 3
if ! curl -fsS "http://127.0.0.1:3001/api/v1/health" >/dev/null; then
  echo "Health check failed, rolling back..."
  if [[ -L "$PREVIOUS_LINK" ]]; then
    ln -sfn "$(readlink -f "$PREVIOUS_LINK")" "$CURRENT_LINK"
    systemctl restart skysealens-api.service
    systemctl restart skysealens-ingest.service
  fi
  exit 1
fi

echo "{\"version\":\"$VERSION\",\"deployed_at\":\"$(date -u +%FT%TZ)\"}" > "$BASE_DIR/deploy-manifest.json"
echo "Deployment successful: $VERSION"
