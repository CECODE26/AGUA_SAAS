# Agua Elite

Software para distribuidoras de agua en bidón. Tiene tres apps conectadas: la del cliente (pide bidones y suma sellos de fidelidad), la del chofer (ruta del día, entregas y venta exprés) y el panel del dueño (pedidos, rutas y programa de fidelidad).

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
