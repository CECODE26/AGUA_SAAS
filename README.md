# Agua Elite

Software para distribuidoras de agua en bidón. Tiene tres apps conectadas: la del cliente (pide bidones y suma sellos de fidelidad), la del chofer (ruta del día, entregas y venta exprés) y el panel del dueño (pedidos, rutas y programa de fidelidad).

## Base de código

El sistema parte de **AGUAPAG** (Agua Manu), el software que ya funciona en producción para una distribuidora. Se integró aquí como punto de partida del SaaS; venía del repo `Janick2025/AGUAPAG` (commit `e31a063`).

| Carpeta | Qué hay |
|---|---|
| `server/` | API en Express + Prisma + PostgreSQL: pedidos, productos, choferes, camiones, rutas, fidelidad, avisos push |
| `client/` | Sitio público y panel del dueño en React + Vite (también empaquetado con Capacitor para Android/iOS) |
| `mobile/` | App Expo (React Native) del cliente y del chofer |
| `docs/agents/` | Guías por área: backend, frontend, devops y testing |
| `docker-compose.*` | Levantar todo con Docker (ver `docker-compose.yml.example`) |
| `app.py`, `templates/`, `static/` | Prototipo inicial en Flask, anterior al sistema actual |

Los comandos y la arquitectura están en `CLAUDE.md`.

## Plantillas de landing

Hay cuatro propuestas de portada, cada una en versión de escritorio (1440 × 900) y de celular (390 × 844). Abre `index.html` para verlas todas juntas.

| Plantilla | Escritorio | Celular |
|---|---|---|
| A · Cristalina | `plantillas/a-cristalina/escritorio.html` | `plantillas/a-cristalina/movil.html` |
| B · Ruta en vivo | `plantillas/b-ruta-en-vivo/escritorio.html` | `plantillas/b-ruta-en-vivo/movil.html` |
| C · Tres apps | `plantillas/c-tres-apps/escritorio.html` | `plantillas/c-tres-apps/movil.html` |
| D · Elite | `plantillas/d-elite/escritorio.html` | `plantillas/d-elite/movil.html` |

Las capturas de cada una están en `plantillas/capturas/`.

Son maquetas de la primera pantalla y tienen medidas fijas: cada versión es un archivo HTML autónomo, sin dependencias, con la ilustración en SVG y las animaciones en CSS. Las animaciones se desactivan si el visitante pide "reducir movimiento". Para usar una como página real, hay que convertirla en una sola página adaptable (escritorio, tablet y celular) y agregar las demás secciones de la landing.
