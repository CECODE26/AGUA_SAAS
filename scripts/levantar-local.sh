#!/usr/bin/env bash
# Levanta Agua Elite en local con Docker en un puerto libre.
#   bash scripts/levantar-local.sh          → levanta (o actualiza) todo
#   bash scripts/levantar-local.sh parar    → lo apaga (los datos se conservan)
# La primera vez crea .env.local-docker con claves al azar (ignorado por git).
set -euo pipefail
cd "$(dirname "$0")/.."
ENV=.env.local-docker
COMPOSE=(docker compose --env-file "$ENV" -f docker-compose.local.yml)

if [ "${1:-}" = "parar" ]; then "${COMPOSE[@]}" down; exit 0; fi

ocupado() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
azar() { LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$1"; }

if [ ! -f "$ENV" ]; then
  {
    printf '%s=%s\n' DB_PASSWORD "$(azar 24)" JWT_SECRET "$(azar 48)"
    printf '%s=%s\n' PLATAFORMA_USUARIO superadmin PLATAFORMA_PASSWORD "$(azar 14)"
    printf '%s=%s\n' SEED_DEMO_PASSWORD "$(azar 12)" VITE_MAPBOX_TOKEN "" MAPBOX_TOKEN ""
  } > "$ENV"
  echo "Creado $ENV con claves nuevas (solo en tu equipo)."
fi

# Puerto: el que ya usaba si sigue siendo nuestro, si no el primero libre desde 8090
actual=$(grep -E '^WEB_PORT=' "$ENV" | cut -d= -f2 || true)
nuestro=$("${COMPOSE[@]}" ps -q client 2>/dev/null || true)
if [ -n "$actual" ] && { [ -n "$nuestro" ] || ! ocupado "$actual"; }; then
  PUERTO=$actual
else
  PUERTO=8090
  while ocupado "$PUERTO"; do PUERTO=$((PUERTO + 1)); done
  grep -v '^WEB_PORT=' "$ENV" > "$ENV.tmp" || true
  echo "WEB_PORT=$PUERTO" >> "$ENV.tmp" && mv "$ENV.tmp" "$ENV"
fi

"${COMPOSE[@]}" up --build -d

echo -n "Esperando al servidor"
for _ in $(seq 1 90); do
  if curl -fs -o /dev/null -H 'X-Distribuidora: demo' "http://localhost:$PUERTO/api/distribuidora"; then break; fi
  echo -n "."; sleep 2
done
echo

usuario=$(grep '^PLATAFORMA_USUARIO=' "$ENV" | cut -d= -f2)
cat <<INFO

Agua Elite corriendo en el puerto $PUERTO
  Landing (Agua Elite)        http://localhost:$PUERTO
  Tu panel de Empresas        http://localhost:$PUERTO/plataforma   (usuario: $usuario)
  Distribuidora de ejemplo    http://demo.localhost:$PUERTO         panel: /admin
Las contraseñas están en $ENV (no se sube a git).
Apagar: bash scripts/levantar-local.sh parar
INFO
