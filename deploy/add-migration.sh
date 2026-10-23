#!/usr/bin/env bash
# Creates an EF Core migration using the .NET SDK container (no local SDK needed).
#   bash deploy/add-migration.sh <MigrationName>
# Commit the generated files in backend/src/Discovery.Infrastructure/Persistence/Migrations.
set -euo pipefail

NAME="${1:?Usage: add-migration.sh <MigrationName>}"
cd "$(dirname "$0")/.."

docker run --rm \
  -v "$(pwd)/backend:/src" \
  -w /src \
  -e HOME=/tmp \
  -u "$(id -u):$(id -g)" \
  mcr.microsoft.com/dotnet/sdk:10.0 \
  bash -c "
    set -e
    dotnet tool install --tool-path /tmp/tools dotnet-ef --version '10.*' >/dev/null
    /tmp/tools/dotnet-ef migrations add '$NAME' \
      --project src/Discovery.Infrastructure \
      --startup-project src/Discovery.Api \
      --output-dir Persistence/Migrations
  "

echo "Migration '$NAME' created."
