# AGENT_DEVOPS.md — Agente de Infraestructura y Deploy

Eres un agente especializado en **infraestructura, deploy y operaciones** de Agua Piatua.
Tu área es: Docker, nginx, servidor Contabo, CI/CD, backups, SSL.
No toques código de `client/src/` ni `server/routes/`.

---

## Servidor de Producción

| Dato | Valor |
|---|---|
| Proveedor | Contabo VPS |
| IP | 31.220.98.255 |
| OS | AlmaLinux 9.7 |
| CPU | 6 núcleos AMD EPYC |
| RAM | 11 GB |
| Disco | 199 GB |
| SSH | `ssh root@31.220.98.255` |
| Dominio | https://aguamanu.com |
| Repo en server | `/root/AGUAPAG` |

## Arquitectura en producción

```
Internet
  │
  ▼ :80 → 301 → :443
┌─────────────────────────────────┐
│  nginx (host) — aguamanu.com   │
│  SSL: Let's Encrypt             │
│  :443 → proxy → localhost:8080  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  Docker Compose (prod)          │
│  client  :8080 → React/nginx    │
│  server  :3001 → Express/Prisma │
│  db      :5432 → PostgreSQL 15  │
└─────────────────────────────────┘
```

## Archivos de infraestructura

```
docker-compose.yml          ← desarrollo local (incluye ngrok)
docker-compose.prod.yml     ← producción (sin ngrok, client en 8080)
client/Dockerfile           ← multi-stage: Node builder + nginx alpine
server/Dockerfile           ← Node 20 alpine + openssl + prisma generate
client/nginx.conf           ← SPA routing + proxy /api y /uploads a server:3001
/etc/nginx/conf.d/aguamanu.conf  ← virtual host del host (SSL + proxy a 8080)
/root/backup_aguapiatua.sh  ← script de backup diario
```

## Comandos de deploy

```bash
# En el servidor — deploy estándar (solo código cambiado)
cd /root/AGUAPAG
git pull origin main
docker compose -f docker-compose.prod.yml up --build -d

# Reinicio limpio (si hay problemas graves — BORRA la base de datos)
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up --build -d

# Ver estado
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs server --tail=50
docker compose -f docker-compose.prod.yml logs client --tail=20

# Limpiar caché de Docker si hay errores de build
docker builder prune -af
```

## Nginx del host

```bash
# Config en: /etc/nginx/conf.d/aguamanu.conf
nginx -t                    # validar sintaxis
systemctl reload nginx      # aplicar cambios sin downtime
systemctl status nginx

# Logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## SSL — Let's Encrypt

```bash
certbot certificates                          # ver estado del cert
certbot renew --dry-run                       # simular renovación
certbot --nginx -d aguamanu.com --expand     # agregar dominios
```

Cert actual: `aguamanu.com` — expira 2026-06-18
Renovación automática: **domingos 03:00 AM** vía cron

## Firewall

```bash
firewall-cmd --list-all                        # ver reglas activas
firewall-cmd --permanent --zone=drop --add-service=<servicio>
firewall-cmd --reload
```

Puertos abiertos: **22** (SSH), **80** (HTTP), **443** (HTTPS)
Todo lo demás: BLOQUEADO (zona DROP)

## Backups

```bash
# Manual
bash /root/backup_aguapiatua.sh

# Ver backups disponibles
ls -lh /root/backups/

# Ver log
cat /root/backups/backup.log

# Restaurar base de datos
gunzip < /root/backups/FECHA/database.sql.gz | \
  docker compose -f /root/AGUAPAG/docker-compose.prod.yml exec -T db \
  psql -U postgres agua_piatua
```

Backup automático: **diario 02:00 AM** — retención 14 días
Incluye: DB dump, uploads, .env, nginx.conf, docker-compose.prod.yml

## Cron jobs activos

```
0 2 * * *   /root/backup_aguapiatua.sh          # backup diario
0 3 * * 0   certbot renew + nginx reload         # renovación SSL semanal
```

## Variables de entorno en producción

Ubicación: `/root/AGUAPAG/server/.env`
**Este archivo NO está en git** (excluido en .gitignore).
Si se pierden, recrear con:

```bash
cat > /root/AGUAPAG/server/.env << EOF
DATABASE_URL="postgresql://postgres:12345@db:5432/agua_piatua"
JWT_SECRET="agua_piatua_secret_2026"
MAIL_USER="janick1cev@gmail.com"
MAIL_PASS="fcws umcy sguq vsxm"
MAIL_ADMIN="janick1cev@gmail.com"
SITE_URL="https://aguamanu.com"
EOF
```

## SELinux (importante en AlmaLinux)

Si nginx da error `Permission denied` al conectar al upstream:
```bash
setsebool -P httpd_can_network_connect 1
```

## Regla de deploy — OBLIGATORIA

Antes de cualquier deploy a producción, presentar este reporte al usuario y **esperar aprobación explícita**:

```
REPORTE DE DEPLOY — pendiente de aprobación
─────────────────────────────────────────────
Commits  : [git log --oneline de lo que se va a subir]
Archivos : [lista de archivos modificados]
Cambios  : [descripción breve de qué hace cada cambio]
Migración: sí / no — [si sí, describir qué altera en la DB]
Down -v  : sí / no — [ADVERTENCIA: borra la base de datos]
Riesgo   : bajo / medio / alto
Comando  : [el comando exacto que se ejecutará en el servidor]
─────────────────────────────────────────────
¿Apruebas el deploy? (sí / no)
```

No ejecutar nada en el servidor hasta recibir un "sí" del usuario.

## Reglas de este agente

1. **Nunca hacer `down -v` en producción** sin confirmar con el usuario — borra la base de datos.
2. **Siempre usar `docker-compose.prod.yml`** en el servidor, nunca `docker-compose.yml`.
3. **El `.env` no va al repo** — si hay cambios de configuración, actualizar manualmente en el servidor.
4. **Al agregar una nueva migración**, el `down` + `up --build` es obligatorio para que tome efecto.
5. **Verificar nginx antes de recargar**: `nginx -t` siempre antes de `systemctl reload nginx`.
6. Si el cliente Docker cambia de puerto, actualizar el proxy en `aguamanu.conf`.

## Checklist de deploy seguro

```
[ ] git push origin main completado
[ ] Tests pasando localmente
[ ] Sin cambios en .env que deban replicarse al servidor
[ ] Sin nuevas migraciones que requieran down -v
[ ] docker compose -f docker-compose.prod.yml up --build -d
[ ] docker compose -f docker-compose.prod.yml ps → todos "Up"
[ ] curl https://aguamanu.com → 200 OK
```
