#!/usr/bin/env bash
# One-shot server setup for Ubuntu/Debian. Run from the repository root:
#   sudo bash deploy/setup-server.sh
# Safe to re-run: it never deletes data or overwrites an existing .env.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin is required (install docker-compose-plugin)." >&2
  exit 1
fi

if [ ! -f .env ]; then
  log "Creating .env with generated secrets"
  cp .env.example .env
  gen() { openssl rand -base64 36 | tr -d '/+=' | cut -c1-32; }
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(gen)|" .env
  sed -i "s|^API_INTERNAL_KEY=.*|API_INTERNAL_KEY=$(gen)|" .env
  ADMIN_PASS="$(gen)"
  sed -i "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=admin@alternivo.com|" .env
  sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PASS}|" .env
  # Until SMTP is configured, allow sign-in without e-mail confirmation.
  sed -i "s|^REQUIRE_CONFIRMED_EMAIL=.*|REQUIRE_CONFIRMED_EMAIL=false|" .env
  echo "Admin login: admin@alternivo.com / ${ADMIN_PASS}  (stored in .env — change it after first login)"
fi

MIGRATIONS_DIR="backend/src/Discovery.Infrastructure/Persistence/Migrations"
if [ ! -d "$MIGRATIONS_DIR" ] || [ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  log "Generating the initial EF Core migration (one time)"
  bash deploy/add-migration.sh InitialCreate
fi

log "Building and starting containers"
docker compose up -d --build

log "Waiting for the API to become healthy"
for i in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1; then
    echo "API is healthy."
    break
  fi
  sleep 5
  if [ "$i" -eq 60 ]; then
    echo "API did not become healthy. Check: docker compose logs api" >&2
    exit 1
  fi
done

log "Done"
docker compose ps
echo
echo "Site:    http://$(hostname -I | awk '{print $1}')/   (set DOMAIN in .env for HTTPS on your domain)"
echo "Logs:    docker compose logs -f api web"
echo "Swagger: ssh -L 8080:127.0.0.1:8080 <server>, set SWAGGER_ENABLED=true, then http://localhost:8080/swagger"
