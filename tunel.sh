#!/bin/bash
# ── Túnel ngrok para pruebas externas — Agua Piatua ─────────────────────────
# Uso: bash tunel.sh

NGROK="$HOME/.local/bin/ngrok"

echo ""
echo "🚀 Levantando servidores..."
echo ""

# Matar procesos anteriores en los puertos si los hay
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Iniciar backend Express
cd "$(dirname "$0")/server"
node index.js &
SERVER_PID=$!
echo "✅ Backend Express corriendo (PID $SERVER_PID)"

# Iniciar frontend Vite
cd "$(dirname "$0")/client"
npm run dev -- --host &
VITE_PID=$!
echo "✅ Frontend Vite corriendo (PID $VITE_PID)"

sleep 2

# Abrir túnel ngrok — solo necesitamos exponer el puerto 5173
# (Vite hace proxy de /api → localhost:3001 internamente)
echo ""
echo "🌐 Abriendo túnel ngrok en puerto 5173..."
echo "   (La URL pública aparecerá abajo en unos segundos)"
echo ""

$NGROK http 5173 --log=stdout &
NGROK_PID=$!

sleep 3

# Obtener la URL pública del túnel
URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | \
  python3 -c "import sys,json; t=json.load(sys.stdin)['tunnels']; print(next(x['public_url'] for x in t if x['proto']=='https'), '')" 2>/dev/null)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
if [ -n "$URL" ]; then
  echo "  🔗 URL PÚBLICA:"
  echo ""
  echo "     $URL"
  echo ""
  echo "  👤 Admin panel:  $URL/admin/login"
  echo "     Usuario: admin  |  Contraseña: piatua2026"
  echo ""
else
  echo "  ⏳ Espera unos segundos y visita: http://localhost:4040"
  echo "     para ver la URL pública generada."
  echo ""
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Presiona Ctrl+C para detener todo."
echo ""

# Mantener corriendo hasta Ctrl+C
trap "echo ''; echo '🛑 Deteniendo...'; kill $SERVER_PID $VITE_PID $NGROK_PID 2>/dev/null; exit" INT
wait
